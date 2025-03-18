$(document).ready(function () {
  const $textarea = $('.participant-list textarea');
  const $canvas = $('.wheel-canvas');
  const $spinButton = $('.spin-button');
  const $winnerPopup = $('.winner-popup');
  const $winnerName = $('#winner-name');
  const ctx = $canvas[0].getContext('2d');
  const spinSound = document.getElementById('spinSound');
  let participants = [];
  const colors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff', '#ff00ff'];
  let rotation = 0;
  let isSpinning = false;
  let lastSegment = -1;

  // Function to draw the wheel
  function drawWheel() {
    ctx.clearRect(0, 0, 400, 400);
    const centerX = 200;
    const centerY = 200;
    const radius = 200;

    if (participants.length === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);

    const arcSize = (2 * Math.PI) / participants.length;
    ctx.lineWidth = 0;
    participants.forEach((name, index) => {
      const startAngle = index * arcSize;
      const endAngle = (index + 1) * arcSize;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Fugaz One", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(name.substring(0, 15), radius - 10, 5);
      ctx.restore();
    });
    ctx.restore();
  }

  // Function to fetch leaderboard data
  function fetchLeaderboard() {
    console.log('Update 1: Starting leaderboard fetch');
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const targetUrl = 'https://www.hdgameful.com/leaderboard';

    // Note for you: Before opening the site, visit https://cors-anywhere.herokuapp.com/
    // and click "Request temporary access" to enable the proxy for your session.
    $.ajax({
      url: proxyUrl + targetUrl,
      method: 'GET',
      success: function (data) {
        console.log('Update 2: Leaderboard data fetched successfully');
        const $html = $(data);

        // Extract top 3 from first container
        const top3 = $html.find('.container.mt-5 .col-sm-12 h4.text-light')
          .map(function () {
            return $(this).text().trim().replace(/[\n\s]+/g, ' ');
          }).get();

        console.log('Update 3: Extracted top 3:', top3);

        // Extract 4-10 from second container
        const rest = $html.find('.container.pt-4 h6.text-info')
          .filter(function () {
            const rank = $(this).find('span.text-white').text();
            return parseInt(rank) >= 4 && parseInt(rank) <= 10;
          })
          .map(function () {
            return $(this).text().trim().replace(/^\d+\.\s*/, '').replace(/[^\w\s]/g, '');
          }).get();

        console.log('Update 4: Extracted 4-10:', rest);

        // Combine and limit to top 10
        participants = [...top3, ...rest].slice(0, 10);

        console.log('Update 5: Combined participants:', participants);

        // Update textarea and redraw wheel
        $textarea.val(participants.join('\n'));
        drawWheel();
        console.log('Update 6: Wheel updated with new participants');
      },
      error: function (xhr, status, error) {
        console.error('Error fetching leaderboard:', error);
        $textarea.val('Error loading leaderboard. Please enable CORS proxy (see console).');
        console.log('Update 7: Fetch failed - Visit https://cors-anywhere.herokuapp.com/ and request access');
      }
    });
  }

  // Update participants and redraw wheel from textarea input
  $textarea.on('input', function () {
    participants = $(this).val().split('\n').filter(name => name.trim() !== '');
    drawWheel();
  });

  $spinButton.on('click', function () {
    if (participants.length === 0) {
      alert('Please add at least one participant!');
      return;
    }
    if (isSpinning) return;

    isSpinning = true;
    $spinButton.prop('disabled', true);

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const segmentAngle = (2 * Math.PI) / participants.length;
    const extraSpins = 5 + Math.random() * 7;
    const baseTarget = extraSpins * 2 * Math.PI - segmentAngle * (winnerIndex + 0.5);
    const suspenseOffset = (Math.random() - 0.5) * segmentAngle * 0.4;
    const targetRotation = baseTarget + suspenseOffset;
    const duration = 5000;
    let startTime = null;
    let initialRotation = rotation;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animateSpin(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOutCubic(progress);
      rotation = initialRotation + (targetRotation - initialRotation) * easedProgress;

      const currentAngle = (-rotation + 2 * Math.PI) % (2 * Math.PI);
      const currentSegment = Math.floor(currentAngle / segmentAngle);
      if (currentSegment !== lastSegment && progress < 1) {
        spinSound.currentTime = 0;
        spinSound.play();
        lastSegment = currentSegment;
      }

      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        rotation = targetRotation % (2 * Math.PI);
        drawWheel();

        const pointer_angle_in_original_wheel = (-rotation + 2 * Math.PI) % (2 * Math.PI);
        const winnerIndexFinal = Math.floor(pointer_angle_in_original_wheel / segmentAngle);
        const winner = participants[winnerIndexFinal];

        $winnerName.text(winner);
        $winnerPopup.fadeIn(300);
        triggerConfetti();

        isSpinning = false;
        $spinButton.prop('disabled', false);
        lastSegment = -1;
      }
    }

    requestAnimationFrame(animateSpin);
  });

  // Popup button handlers
  $('.close-btn').on('click', function () {
    $winnerPopup.fadeOut(300);
  });

  $('.remove-btn').on('click', function () {
    const winner = $winnerName.text();
    const indexToRemove = participants.indexOf(winner);
    if (indexToRemove !== -1) {
      participants.splice(indexToRemove, 1);
      $textarea.val(participants.join('\n'));
      $winnerPopup.fadeOut(300);
      drawWheel();
    }
  });

  // Confetti effect
  function triggerConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.75 },
      colors: ['#fe1d69', '#ff0000', '#00ff00', '#0000ff', '#ffff00'],
    });
  }

  // Fetch leaderboard on every page load
  fetchLeaderboard();
});
