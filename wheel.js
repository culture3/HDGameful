$(document).ready(function () {
  // Wheel state management for both RustMagic and Upgrader
  const wheels = {
    rustmagic: {
      $textarea: $('textarea[data-wheel="rustmagic"]'),
      $canvas: $('canvas[data-wheel="rustmagic"]'),
      $spinButton: $('button[data-wheel="rustmagic"]'),
      $winnerPopup: $('.winner-popup[data-wheel="rustmagic"]'),
      $winnerName: $('#winner-name-rustmagic'),
      ctx: $('canvas[data-wheel="rustmagic"]')[0].getContext('2d'),
      participants: [],
      rotation: 0,
      isSpinning: false,
      lastSegment: -1,
      leaderboardUrl: 'https://staticstony.great-site.net/fetch_leaderboard.php?type=rustmagic'
    },
    upgrader: {
      $textarea: $('textarea[data-wheel="upgrader"]'),
      $canvas: $('canvas[data-wheel="upgrader"]'),
      $spinButton: $('button[data-wheel="upgrader"]'),
      $winnerPopup: $('.winner-popup[data-wheel="upgrader"]'),
      $winnerName: $('#winner-name-upgrader'),
      ctx: $('canvas[data-wheel="upgrader"]')[0].getContext('2d'),
      participants: [],
      rotation: 0,
      isSpinning: false,
      lastSegment: -1,
      leaderboardUrl: 'https://staticstony.great-site.net/fetch_leaderboard.php?type=upgrader'
    }
  };

  const colors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff', '#ff00ff'];
  const spinSound = document.getElementById('spinSound');

  // Function to draw the wheel
  function drawWheel(wheel) {
    wheel.ctx.clearRect(0, 0, 400, 400);
    const centerX = 200;
    const centerY = 200;
    const radius = 200;

    if (wheel.participants.length === 0) {
      wheel.ctx.fillStyle = '#ffffff';
      wheel.ctx.beginPath();
      wheel.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      wheel.ctx.fill();
      return;
    }

    wheel.ctx.save();
    wheel.ctx.translate(centerX, centerY);
    wheel.ctx.rotate(wheel.rotation);
    wheel.ctx.translate(-centerX, -centerY);

    const arcSize = (2 * Math.PI) / wheel.participants.length;
    wheel.ctx.lineWidth = 0;
    wheel.participants.forEach((name, index) => {
      const startAngle = index * arcSize;
      const endAngle = (index + 1) * arcSize;

      wheel.ctx.beginPath();
      wheel.ctx.moveTo(centerX, centerY);
      wheel.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      wheel.ctx.fillStyle = colors[index % colors.length];
      wheel.ctx.fill();

      wheel.ctx.save();
      wheel.ctx.translate(centerX, centerY);
      wheel.ctx.rotate(startAngle + arcSize / 2);
      wheel.ctx.fillStyle = '#ffffff';
      wheel.ctx.font = '16px "Fugaz One", sans-serif';
      wheel.ctx.textAlign = 'right';
      wheel.ctx.fillText(name.substring(0, 15), radius - 10, 5);
      wheel.ctx.restore();
    });
    wheel.ctx.restore();
  }

  // Function to fetch participants from the PHP script
  function fetchLeaderboard(wheel) {
    console.log(`Fetching leaderboard for ${wheel === wheels.rustmagic ? 'RustMagic' : 'Upgrader'}`);
    const targetUrl = wheel.leaderboardUrl;

    $.ajax({
      url: targetUrl,
      method: 'GET',
      dataType: 'json', // Expect JSON response
      success: function (data) {
        // Extract participants from JSON and clean up names
        let participants = data.participants || [];
        participants = participants.map(name => 
          name.replace(/["\\u00a0]/g, '').trim() // Remove quotes, non-breaking spaces, and trim
        ).filter(name => name !== ''); // Remove empty entries

        // Limit to top 10 and remove duplicates
        const uniqueNames = [...new Set(participants)].slice(0, 10);
        wheel.participants = uniqueNames;

        // Update textarea and redraw wheel
        wheel.$textarea.val(wheel.participants.join('\n'));
        drawWheel(wheel);
      },
      error: function (xhr, status, error) {
        console.error(`Error fetching leaderboard for ${wheel === wheels.rustmagic ? 'RustMagic' : 'Upgrader'}:`, error);
        wheel.$textarea.val('Error loading participants. Check console for details.');
        drawWheel(wheel);
      }
    });
  }

  // Update participants and redraw wheel from textarea input
  function setupTextarea(wheel) {
    wheel.$textarea.on('input', function () {
      wheel.participants = $(this).val().split('\n').filter(name => name.trim() !== '');
      drawWheel(wheel);
    });
  }

  // Spin functionality
  function setupSpin(wheel) {
    wheel.$spinButton.on('click', function () {
      if (wheel.participants.length === 0) {
        alert('Please add at least one participant!');
        return;
      }
      if (wheel.isSpinning) return;

      wheel.isSpinning = true;
      wheel.$spinButton.prop('disabled', true);

      const winnerIndex = Math.floor(Math.random() * wheel.participants.length);
      const segmentAngle = (2 * Math.PI) / wheel.participants.length;
      const extraSpins = 5 + Math.random() * 7;
      const baseTarget = extraSpins * 2 * Math.PI - segmentAngle * (winnerIndex + 0.5);
      const suspenseOffset = (Math.random() - 0.5) * segmentAngle * 0.4;
      const targetRotation = baseTarget + suspenseOffset;
      const duration = 5000;
      let startTime = null;
      let initialRotation = wheel.rotation;

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function animateSpin(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easedProgress = easeOutCubic(progress);
        wheel.rotation = initialRotation + (targetRotation - initialRotation) * easedProgress;

        const currentAngle = (-wheel.rotation + 2 * Math.PI) % (2 * Math.PI);
        const currentSegment = Math.floor(currentAngle / segmentAngle);
        if (currentSegment !== wheel.lastSegment && progress < 1) {
          spinSound.currentTime = 0;
          spinSound.play();
          wheel.lastSegment = currentSegment;
        }

        drawWheel(wheel);

        if (progress < 1) {
          requestAnimationFrame(animateSpin);
        } else {
          wheel.rotation = targetRotation % (2 * Math.PI);
          drawWheel(wheel);

          const pointerAngle = (-wheel.rotation + 2 * Math.PI) % (2 * Math.PI);
          const winnerIndexFinal = Math.floor(pointerAngle / segmentAngle);
          const winner = wheel.participants[winnerIndexFinal];

          wheel.$winnerName.text(winner);
          wheel.$winnerPopup.fadeIn(300);
          triggerConfetti();

          wheel.isSpinning = false;
          wheel.$spinButton.prop('disabled', false);
          wheel.lastSegment = -1;
        }
      }

      requestAnimationFrame(animateSpin);
    });
  }

  // Popup button handlers
  function setupPopup(wheel) {
    wheel.$winnerPopup.find('.close-btn').on('click', function () {
      wheel.$winnerPopup.fadeOut(300);
    });

    wheel.$winnerPopup.find('.remove-btn').on('click', function () {
      const winner = wheel.$winnerName.text();
      const indexToRemove = wheel.participants.indexOf(winner);
      if (indexToRemove !== -1) {
        wheel.participants.splice(indexToRemove, 1);
        wheel.$textarea.val(wheel.participants.join('\n'));
        wheel.$winnerPopup.fadeOut(300);
        drawWheel(wheel);
      }
    });
  }

  // Confetti effect
  function triggerConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.75 },
      colors: ['#fe1d69', '#ff0000', '#00ff00', '#0000ff', '#ffff00'],
    });
  }

  // Tab switching
  $('.tab-item').on('click', function () {
    $('.tab-item').removeClass('active');
    $(this).addClass('active');

    $('.wheel-tab-content').hide();
    $(`#${$(this).data('tab')}`).show();
  });

  // Initialize both wheels
  Object.values(wheels).forEach(wheel => {
    setupTextarea(wheel);
    setupSpin(wheel);
    setupPopup(wheel);
    fetchLeaderboard(wheel);
  });
});
