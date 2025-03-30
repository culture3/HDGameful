$(document).ready(function () {
  const $keywordInput = $('#keyword-input');
  const $clearButton = $('#clear-giveaway');
  const $spinContainer = $('.spin-container');
  const $spinButton = $('#spin-wheel');
  const $participantCount = $('#participant-count');
  const $participantNames = $('#participant-names');
  const $winnerName = $('#winner-name');
  const $winnerMessages = $('#winner-messages');
  const tickSound = document.getElementById('tickSound');
  const winSound = document.getElementById('winSound');

  let keyword = '';
  let participants = [];
  let isSpinning = false;
  let activeWinner = null;
  const totalReelItems = 100;
  let reelParticipants = [];

  const wsEndpoint = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false';
  const chatroomId = 55;
  const channelName = `chatrooms.${chatroomId}.v2`;
  let socket;

  function initWebSocket() {
    socket = new WebSocket(wsEndpoint);

    socket.onopen = function () {
      console.log('WebSocket connection established');
      const subscribeMessage = {
        event: 'pusher:subscribe',
        data: {
          channel: channelName,
          auth: ''
        }
      };
      socket.send(JSON.stringify(subscribeMessage));
      console.log(`Subscribed to channel: ${channelName}`);
    };

    socket.onmessage = function (event) {
      console.log('Raw WebSocket message received:', event.data);
      const messageData = JSON.parse(event.data);
      console.log('Parsed message:', messageData);

      if (messageData.event === 'pusher:subscription_succeeded') {
        console.log('Subscription to chatroom successful');
        return;
      }

      if (messageData.event === 'App\\Events\\ChatMessageEvent' && messageData.channel === channelName) {
        const chatMessage = JSON.parse(messageData.data);
        console.log('Chat message details:', chatMessage);

        const messageContent = chatMessage.content.trim();
        const username = chatMessage.sender.username;
        console.log(`Message content: "${messageContent}", Username: "${username}", Current keyword: "${keyword}"`);

        if (keyword && messageContent.toLowerCase() === keyword.toLowerCase() && !isSpinning) {
          console.log(`Keyword match detected! Adding ${username} as participant`);
          addParticipant(username);
        } else if (isSpinning) {
          console.log(`Keyword match ignored: Spin in progress`);
        }

        if (activeWinner && username === activeWinner) {
          $winnerMessages.append(`<p>${messageContent}</p>`);
          $winnerMessages.scrollTop($winnerMessages[0].scrollHeight);
        }
      } else {
        console.log('Message ignored: Not a chat message event or wrong channel');
      }
    };

    socket.onerror = function (error) {
      console.error('WebSocket error:', error);
    };

    socket.onclose = function () {
      console.log('WebSocket connection closed, attempting to reconnect...');
      setTimeout(initWebSocket, 5000);
    };
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  $keywordInput.on('input', debounce(function () {
    keyword = $(this).val().trim();
    if (keyword) {
      console.log(`Keyword set to: ${keyword}`);
    } else {
      console.log('Keyword cleared');
    }
  }, 2000));

  $clearButton.on('click', function () {
    keyword = '';
    participants = [];
    activeWinner = null;
    $keywordInput.val('').prop('disabled', false);
    $participantCount.text('0');
    $participantNames.empty();
    $spinContainer.empty();
    $spinButton.prop('disabled', false).text('Spin');
    $winnerName.text('None');
    $winnerMessages.empty();
    isSpinning = false;
  });

  function addParticipant(name) {
    if (!participants.includes(name)) {
      participants.push(name);
      $participantCount.text(participants.length);
      $participantNames.append(`<li>${name}</li>`);
      populateReel();
      console.log(`Participant added: ${name}, Total participants: ${participants.length}`);
    } else {
      console.log(`Participant ${name} already added`);
    }
  }

  function populateReel() {
    $spinContainer.empty();
    reelParticipants = [];
    if (participants.length === 0) return;

    const repeatCount = Math.floor(totalReelItems / participants.length);
    const extraSlots = totalReelItems % participants.length;
    let participantIndex = 0;

    for (let i = 0; i < totalReelItems; i++) {
      const participant = participants[participantIndex];
      const itemDiv = $(`
        <div class="item">
          <div class="item-wrapper">
            <img src="TM.png" alt="Watermark" class="watermark">
            <span class="participant-name">${participant}</span>
          </div>
        </div>
      `);
      $spinContainer.append(itemDiv);
      reelParticipants.push(participant);

      participantIndex++;
      if (participantIndex >= participants.length) participantIndex = 0;
    }

    if (extraSlots > 0) {
      for (let i = totalReelItems - extraSlots; i < totalReelItems; i++) {
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        $($spinContainer.children()[i]).find('.participant-name').text(randomParticipant);
        reelParticipants[i] = randomParticipant;
      }
    }
  }

  $spinButton.on('click', function () {
    if (participants.length === 0 || isSpinning) return;
    spinWheel($(this));
  });

  function spinWheel($button) {
    isSpinning = true;
    $button.prop('disabled', true).text('Spinning...');
    $spinContainer.css('left', '0px');
    populateReel();

    $('.item').css({ transform: 'none', animation: 'none', opacity: 0.5 });
    $('.participant-name').removeClass('breathing-effect');

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIndex];
    const itemWidth = $('.item').outerWidth(true);
    const minStopIndex = 50;
    const maxStopIndex = totalReelItems - 10;
    const stopIndex = Math.floor(Math.random() * (maxStopIndex - minStopIndex + 1) + minStopIndex);

    reelParticipants = reelParticipants.map((p, i) => (i === stopIndex ? winner : p));
    for (let i = 0; i < totalReelItems; i++) {
      $($spinContainer.children()[i]).find('.participant-name').text(reelParticipants[i]);
    }

    const caseContainerWidth = $('.case-container').width();
    const centerPosition = -1 * (itemWidth * stopIndex - caseContainerWidth / 2 + itemWidth / 2);
    const randomOffset = Math.random() * 100 - 50;
    const stopPosition = centerPosition + randomOffset;

    const caseContainerLeft = $('.case-container').offset().left;
    const absoluteCenter = caseContainerLeft + caseContainerWidth / 2;
    let lastCenteredItemIndex = -1;

    $spinContainer.animate(
      { left: stopPosition },
      {
        duration: 7500,
        easing: 'easeOutExpo',
        step: function (now) {
          $(this).css('left', now + 'px');
          lastCenteredItemIndex = updateItemOpacityAndSound(itemWidth, absoluteCenter, lastCenteredItemIndex);
        },
        complete: function () {
          $spinContainer.animate(
            { left: centerPosition },
            {
              duration: 700,
              easing: 'easeInOutQuad',
              step: function (now) {
                $(this).css('left', now + 'px');
                lastCenteredItemIndex = updateItemOpacityAndSound(itemWidth, absoluteCenter, lastCenteredItemIndex);
              },
              complete: function () {
                const $winningElement = $($spinContainer.children()[stopIndex]);
                $winningElement.css({ opacity: 1 });
                $winningElement.find('.participant-name').addClass('breathing-effect');
                $('.item').not($winningElement).css('opacity', 0.5);

                activeWinner = winner;
                $winnerName.text(winner);
                $winnerMessages.empty();

                triggerConfetti($winningElement);
                playWinSound();
                $button.prop('disabled', false).text('Spin Again');
                isSpinning = false; // Spin ends, keyword becomes active again
              }
            }
          );
        }
      }
    );
  }

  function updateItemOpacityAndSound(itemWidth, absoluteCenter, lastCenteredItemIndex) {
    let closestItemIndex = -1;
    let minDistanceFromCenter = Infinity;

    $('.item').each(function (index) {
      const $item = $(this);
      const itemLeft = $item.offset().left;
      const itemCenter = itemLeft + itemWidth / 2;
      const distanceFromCenter = Math.abs(itemCenter - absoluteCenter);

      $item.css('opacity', distanceFromCenter < itemWidth / 2 ? 1 : 0.5);
      const $watermark = $item.find('.watermark');
      $watermark.css({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

      if (distanceFromCenter < minDistanceFromCenter) {
        minDistanceFromCenter = distanceFromCenter;
        closestItemIndex = index;
      }
    });

    if (closestItemIndex !== -1 && closestItemIndex !== lastCenteredItemIndex) {
      tickSound.currentTime = 0;
      tickSound.play().catch((error) => console.log('Error playing tick sound:', error));
      return closestItemIndex;
    }
    return lastCenteredItemIndex;
  }

  function triggerConfetti($winningElement) {
    const itemPosition = $winningElement.offset();
    const itemWidth = $winningElement.width();
    const originX = (itemPosition.left + itemWidth / 2) / window.innerWidth;
    const originY = Math.max(0, (itemPosition.top - -75)) / window.innerHeight;

    confetti({
      particleCount: 100,
      spread: 300,
      origin: { x: originX, y: originY },
      colors: ['#fe1d69', '#ff0000', '#00ff00', '#0000ff', '#ffff00'],
      shapes: ['square', 'circle'],
      gravity: 0.2,
      scalar: 1.2,
      startVelocity: 40,
    });
  }

  function playWinSound() {
    winSound.currentTime = 0;
    winSound.play().catch((error) => console.log('Error playing win sound:', error));
  }

  initWebSocket();
});