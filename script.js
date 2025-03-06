$(document).ready(function () {
  const items = [
    { name: "5 Coins RustMagic", probability: 30, image: "item.png" },
    { name: "$5 Upgrader", probability: 20, image: "item2.png" },
    { name: "10 Coins RustMagic", probability: 25, image: "item3.png" },
    { name: "$10 Upgrader", probability: 15, image: "item4.png" },
    { name: "15 Coins RustMagic", probability: 2.5, image: "item5.png" },
    { name: "RustMagic Free Battle", probability: 2.5, image: "item6.png" },
    { name: "$15 Upgrader", probability: 2.25, image: "item7.png" },
    { name: "Upgrader Free Battle", probability: 2.25, image: "item8.png" },
    { name: "REROLL ALL WINS X2", probability: 0.5, image: "item9.gif" },
  ];

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
  const totalProb = probs[probs.length - 1]; // Get the total probability of the pool
  const rand = Math.random() * totalProb; // Scale random number to total probability
  for (let i = 0; i < probs.length; i++) {
    if (rand <= probs[i]) {
      return itemPool[i];
    }
  }
  return itemPool[itemPool.length - 1]; // Fallback (should rarely hit now)
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
      const displayName = isTop10 ? "Special Item" : randomItem.name;
      const itemDiv = $(
        `<div class="item">
          <div class="item-wrapper">
            <img src="TM.png" alt="Watermark" class="watermark">
            <img src="${displayImage}" alt="${displayName}" class="item-image">
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
    const displayName = isTop10Percent && !isSpecialSpin ? "Special Item" : winningItem.name;
    $(spinContainer.children()[stopIndex]).html(
      `<div class="item-wrapper">
        <img src="TM.png" alt="Watermark" class="watermark">
        <img src="${displayImage}" alt="${displayName}" class="item-image">
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
        duration: 8000,
        easing: "easeOutExpo",
        step: function (now) {
          $(this).css("left", now + "px");
          lastCenteredItemIndex = updateItemOpacityAndSound(itemWidth, absoluteCenter, lastCenteredItemIndex);
        },
        complete: function () {
          spinContainer.animate(
            { left: centerPosition },
            {
              duration: 750,
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

                if (isTop10Percent && !isSpecialSpin) {
                  $(".winning-item-name").html("You hit a rare item! Re-spinning...");
                  isSpecialSpin = true;
                  specialItemPool = top10PercentItems;
                  setTimeout(() => spinWheel(button), 2000);
                } else {
                  $(".winning-item-name").html(`Congratulations, you won: ${winningItem.name}!`);
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
});