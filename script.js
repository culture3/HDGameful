$(document).ready(function () {
  const items = [
    { name: "REROLL ALL WINS X2", probability: 0.5, image: "item9.gif" },
    { name: "$15 Upgrader", probability: 1.25, image: "item7.png" },
    { name: "Upgrader Free Battle", probability: 1.25, image: "item8.png" },
    { name: "15 Coins RustMagic", probability: 1.75, image: "item5.png" },
    { name: "RustMagic Free Battle", probability: 1.75, image: "item6.png" },
    { name: "15 Coins CSGOGem", probability: 1.75, image: "item12.png" },
    { name: "CSGOGem Free Battle", probability: 1.75, image: "item13.png" },
    { name: "$10 Upgrader", probability: 12, image: "item4.png" },
    { name: "$5 Upgrader", probability: 14, image: "item2.png" },
    { name: "10 Coins RustMagic", probability: 15, image: "item3.png" },
    { name: "10 Coins CSGOGem", probability: 15, image: "item11.png" },
    { name: "5 Coins RustMagic", probability: 17, image: "item.png" },
    { name: "5 Coins CSGOGem", probability: 17, image: "item10.png" },
  ];

  function getShortName(fullName) {
    if (fullName.includes("Coins")) {
      return fullName.split(" ")[0] + " Coins";
    }
    if (fullName.startsWith("$")) {
      return fullName.split(" ")[0];
    }
    if (fullName.includes("Free Battle")) {
      return "Free Battle";
    }
    if (fullName.includes("REROLL")) {
      return "Reroll x2";
    }
    return fullName;
  }

  const sortedItems = [...items].sort((a, b) => a.probability - b.probability);
  let cumulativeProb = 0;
  const top10PercentItems = sortedItems.filter((item) => {
    if (cumulativeProb < 10) {
      cumulativeProb += item.probability;
      return true;
    }
    return false;
  });

  cumulativeProb = 0;
  const cumulativeProbs = items.map((item) => {
    cumulativeProb += item.probability;
    return cumulativeProb;
  });

  function updateItemListPercentages() {
    const itemListContainer = $('.item-list-items');
    itemListContainer.empty();

    // Sort items by probability (lowest to highest) for display
    const sortedItemsForDisplay = [...items].sort((a, b) => a.probability - b.probability);

    sortedItemsForDisplay.forEach(item => {
      const itemDiv = $(`
        <div class="item-list-item" data-item="${item.name}">
          <div class="item-image">
            <img src="${item.image}" alt="${item.name}">
            <span class="percentage">${item.probability}%</span>
          </div>
          <span class="item-name">${item.name}</span>
        </div>
      `);
      itemListContainer.append(itemDiv);
    });
  }

  updateItemListPercentages();

  function getRandomItem(itemPool = items, probs = cumulativeProbs) {
    const totalProb = probs[probs.length - 1];
    const rand = Math.random() * totalProb;
    for (let i = 0; i < probs.length; i++) {
      if (rand <= probs[i]) {
        return itemPool[i];
      }
    }
    return itemPool[itemPool.length - 1];
  }

  const spinContainer = $(".spin-container");
  const totalReelItems = 100;
  let reelItems = [];
  let isSpecialSpin = false;
  let specialItemPool = [];

  function populateReel(itemPool = items) {
    spinContainer.empty();
    reelItems = [];
    for (let i = 0; i < totalReelItems; i++) {
      const randomItem = getRandomItem(itemPool, cumulativeProbsForPool(itemPool));
      const isTop10 = !isSpecialSpin && top10PercentItems.some(item => item.name === randomItem.name);
      const displayImage = isTop10 ? "gold.gif" : randomItem.image;
      const shortName = getShortName(randomItem.name);
      const displayName = isTop10 ? "HD Spin" : shortName;
      const itemDiv = $(
        `<div class="item">
          <div class="item-wrapper">
            <img src="TM.png" alt="Watermark" class="watermark">
            <img src="${displayImage}" alt="${displayName}" class="item-image">
            <span class="winning-item-text">${displayName}</span>
          </div>
        </div>`
      );
      spinContainer.append(itemDiv);
      reelItems.push(randomItem);
    }
  }

  function cumulativeProbsForPool(itemPool) {
    let cumProb = 0;
    return itemPool.map((item) => (cumProb += item.probability));
  }

  const tickSound = document.getElementById("tickSound");
  const winSound = document.getElementById("winSound");
  populateReel();

  $(".open-button button").on("click", function () {
    spinWheel($(this));
  });

  function spinWheel(button) {
    button.prop("disabled", true).text("Spinning...");
    spinContainer.css("left", "0px");
    populateReel(isSpecialSpin ? specialItemPool : items);

    $(".item").css({ transform: "none", animation: "none", opacity: 0.5 });
    $(".item img").css({ animation: "none", transform: "none" });

    const winningItem = getRandomItem(isSpecialSpin ? specialItemPool : items, 
                                     cumulativeProbsForPool(isSpecialSpin ? specialItemPool : items));
    const isTop10Percent = !isSpecialSpin && top10PercentItems.some(item => item.name === winningItem.name);

    const itemWidth = $(".item").outerWidth(true);
    const totalWidth = itemWidth * totalReelItems;
    const minStopIndex = 50;
    const maxStopIndex = totalReelItems - 10;
    const stopIndex = Math.floor(Math.random() * (maxStopIndex - minStopIndex + 1) + minStopIndex);

    reelItems[stopIndex] = winningItem;
    const displayImage = isTop10Percent && !isSpecialSpin ? "gold.gif" : winningItem.image;
    const shortName = getShortName(winningItem.name);
    const displayNameDuringSpin = isTop10Percent && !isSpecialSpin ? "HD Spin" : shortName;
    $(spinContainer.children()[stopIndex]).html(
      `<div class="item-wrapper">
        <img src="TM.png" alt="Watermark" class="watermark">
        <img src="${displayImage}" alt="${displayNameDuringSpin}" class="item-image">
        <span class="winning-item-text">${displayNameDuringSpin}</span>
      </div>`
    );

    const caseContainerWidth = $(".case-container").width();
    const centerPosition = -1 * (itemWidth * stopIndex - caseContainerWidth / 2 + itemWidth / 2);
    const randomOffset = Math.random() * 100 - 50;
    const stopPosition = centerPosition + randomOffset;

    const caseContainerLeft = $(".case-container").offset().left;
    const absoluteCenter = caseContainerLeft + caseContainerWidth / 2;
    let lastCenteredItemIndex = -1;

    spinContainer.animate(
      { left: stopPosition },
      {
        duration: 7500,
        easing: "easeOutExpo",
        step: function (now) {
          $(this).css("left", now + "px");
          lastCenteredItemIndex = updateItemOpacityAndSound(itemWidth, absoluteCenter, lastCenteredItemIndex);
        },
        complete: function () {
          spinContainer.animate(
            { left: centerPosition },
            {
              duration: 700,
              easing: "easeInOutQuad",
              step: function (now) {
                $(this).css("left", now + "px");
                lastCenteredItemIndex = updateItemOpacityAndSound(itemWidth, absoluteCenter, lastCenteredItemIndex);
              },
              complete: function () {
                const winningElement = $(spinContainer.children()[stopIndex]);
                winningElement.css({ opacity: 1 });
                winningElement.find(".item-image").addClass("float-image");
                $(".item").not(winningElement).css("opacity", 0.5);

                const fullDisplayName = isTop10Percent && !isSpecialSpin ? "HD Spin" : winningItem.name;
                winningElement.find(".item-wrapper").html(
                  `<img src="TM.png" alt="Watermark" class="watermark">
                   <img src="${displayImage}" alt="${fullDisplayName}" class="item-image float-image">
                   <span class="winning-item-text">${fullDisplayName}</span>`
                );

                if (isTop10Percent && !isSpecialSpin) {
                  console.log("You hit a rare item! Re-spinning...");
                  isSpecialSpin = true;
                  specialItemPool = top10PercentItems;
                  setTimeout(() => spinWheel(button), 1500);
                } else {
                  triggerConfetti(winningElement);
                  playWinSound();
                  button.prop("disabled", false).text("Spin Again");
                  if (isSpecialSpin) isSpecialSpin = false;
                }
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

    $(".item").each(function (index) {
      const item = $(this);
      const itemLeft = item.offset().left;
      const itemCenter = itemLeft + itemWidth / 2;
      const distanceFromCenter = Math.abs(itemCenter - absoluteCenter);

      item.css("opacity", distanceFromCenter < itemWidth / 2 ? 1 : 0.5);
      const watermark = item.find(".watermark");
      watermark.css({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });

      if (distanceFromCenter < minDistanceFromCenter) {
        minDistanceFromCenter = distanceFromCenter;
        closestItemIndex = index;
      }
    });

    if (closestItemIndex !== -1 && closestItemIndex !== lastCenteredItemIndex) {
      tickSound.currentTime = 0;
      tickSound.play().catch((error) => console.log("Error playing tick sound:", error));
      return closestItemIndex;
    }
    return lastCenteredItemIndex;
  }

  function triggerConfetti(winningElement) {
    const itemPosition = winningElement.offset();
    const itemWidth = winningElement.width();
    const itemHeight = winningElement.height();
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
      disableForReducedMotion: true,
    });
  }

  function playWinSound() {
    if (winSound) {
      winSound.currentTime = 0;
      winSound.play().catch((error) => console.log("Error playing win sound:", error));
    } else {
      console.log("Win sound element not found!");
    }
  }
});