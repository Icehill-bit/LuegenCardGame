window.addEventListener("DOMContentLoaded", function () {
// Card game script

const mainMenu = document.getElementById("main-menu");
const gameBoard = document.getElementById("game-board");
const btnSingleplayer = document.getElementById("btn-singleplayer");
const btnMultiplayer = document.getElementById("btn-multiplayer");
const btnSortHand = document.getElementById("btn-sort-hand");
const btnPlaySelected = document.getElementById("btn-play-selected");
const btnCallBluff = document.getElementById("btn-call-bluff");
const claimRankSelect = document.getElementById("claim-rank");
const gameModeTitle = document.getElementById("game-mode-title");
const turnIndicator = document.getElementById("turn-indicator");
const lastCall = document.getElementById("last-call");
const playLog = document.getElementById("play-log");
const centerPileVisual = document.getElementById("center-pile-visual");
const winOverlay = document.getElementById("win-overlay");
const winTitle = document.getElementById("win-title");
const winSubtitle = document.getElementById("win-subtitle");
const tableSeats = {
    north: document.getElementById("seat-north"),
    east: document.getElementById("seat-east"),
    west: document.getElementById("seat-west"),
    south: document.getElementById("seat-south")
};

const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const botTurnDelayMs = 1600;
const rankValue = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13
};

const playerHandTitle = document.getElementById("player-hand-title");
const playerHandContainer = document.getElementById("player-hand");
const seatOrder = ["south", "north", "east", "west"];
const clockwiseSeatCycle = ["north", "east", "south", "west"];
let seatByPlayerIndex = [];

let cardDisplay = document.getElementById("card-display");
if (!cardDisplay) {
    cardDisplay = document.createElement("p");
    cardDisplay.id = "card-display";
    gameBoard.appendChild(cardDisplay);
}

let myDeck = [];
let playerHands = [];
let activePlayerIndex = 0;
let playerNames = [];
let selectedCards = new Set();
let centerPile = [];
let isGameOver = false;
let currentCallRank = null;
let lastPlay = null;
let visualPileCount = 0;

function removeFourOfKindForPlayer(playerIndex) {
    const hand = playerHands[playerIndex] || [];
    const removedRanks = [];

    for (const rank of ranks) {
        if (rank === "A") {
            continue;
        }

        const requiredCards = suits.map(function (suit) {
            return rank + " of " + suit;
        });

        const hasAllCards = requiredCards.every(function (card) {
            return hand.includes(card);
        });

        if (!hasAllCards) {
            continue;
        }

        playerHands[playerIndex] = (playerHands[playerIndex] || []).filter(function (card) {
            return !requiredCards.includes(card);
        });
        removedRanks.push(rank);
    }

    return removedRanks;
}

function removeFourOfKindForAllPlayers() {
    const removals = [];

    for (let i = 0; i < playerNames.length; i++) {
        const removedRanks = removeFourOfKindForPlayer(i);
        if (removedRanks.length > 0) {
            removals.push({ playerIndex: i, ranks: removedRanks });
        }
    }

    return removals;
}

function announceRemovedSets(removals) {
    if (!removals || removals.length === 0) {
        return;
    }

    const messages = removals.map(function (entry) {
        const name = playerNames[entry.playerIndex] || ("P" + (entry.playerIndex + 1));
        return name + " removed set(s): " + entry.ranks.join(", ");
    });

    for (const message of messages) {
        addLogEntry(message);
    }

    cardDisplay.textContent = messages.join(" | ");
}

function findPlayerWithAllAces() {
    const aceCards = suits.map(function (suit) {
        return "A of " + suit;
    });

    for (let i = 0; i < playerNames.length; i++) {
        const hand = playerHands[i] || [];
        const hasAllAces = aceCards.every(function (card) {
            return hand.includes(card);
        });

        if (hasAllAces) {
            return i;
        }
    }

    return -1;
}

function handleAllAcesLossIfNeeded() {
    const loserIndex = findPlayerWithAllAces();
    if (loserIndex === -1) {
        return false;
    }

    isGameOver = true;
    const loserName = playerNames[loserIndex] || ("P" + (loserIndex + 1));
    cardDisplay.textContent = loserName + " collected all four aces and loses automatically";
    addLogEntry(loserName + " collected all four aces and loses automatically.");
    showWinAnimation(loserName + " loses", "Four aces penalty triggered");

    renderPlayerHand();
    renderTablePlayers();
    updateTurnIndicator();
    updateActionState();
    return true;
}

function showWinAnimation(title, subtitle) {
    if (!winOverlay || !winTitle || !winSubtitle) {
        return;
    }

    winTitle.textContent = title;
    winSubtitle.textContent = subtitle;
    winOverlay.classList.add("show");
}

function hideWinAnimation() {
    if (!winOverlay) {
        return;
    }

    winOverlay.classList.remove("show");
}

function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(rank + " of " + suit);
        }
    }
    return deck;
}

function dealAllCards(playerCount) {
    myDeck = createDeck();
    playerHands = Array.from({ length: playerCount }, function () { return []; });

    while (myDeck.length > 0) {
        for (let i = 0; i < playerHands.length; i++) {
            if (myDeck.length === 0) {
                break;
            }

            const randomIndex = Math.floor(Math.random() * myDeck.length);
            const dealtCard = myDeck.splice(randomIndex, 1)[0];
            playerHands[i].push(dealtCard);
        }
    }
}

function getCardRank(cardLabel) {
    return (cardLabel.split(" of ")[0] || "").trim();
}

function cardToDataUri(cardLabel) {
    const rank = getCardRank(cardLabel) || "?";
    const suit = cardLabel.split(" of ")[1] || "Unknown";
    const isRed = suit === "Hearts" || suit === "Diamonds";
    const color = isRed ? "#c62828" : "#1a1a1a";
    const symbolMap = {
        Hearts: "♥",
        Diamonds: "♦",
        Clubs: "♣",
        Spades: "♠"
    };
    const symbol = symbolMap[suit] || "?";

    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='84' height='120' viewBox='0 0 84 120'>"
        + "<rect x='1' y='1' width='82' height='118' rx='10' ry='10' fill='white' stroke='#232323' stroke-width='2'/>"
        + "<text x='10' y='18' font-size='15' fill='" + color + "' font-family='Verdana'>" + rank + "</text>"
        + "<text x='42' y='67' text-anchor='middle' font-size='32' fill='" + color + "' font-family='Verdana'>" + symbol + "</text>"
        + "<text x='74' y='112' text-anchor='end' font-size='15' fill='" + color + "' font-family='Verdana'>" + rank + "</text>"
        + "</svg>";

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function cardBackDataUri() {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='84' height='120' viewBox='0 0 84 120'>"
        + "<rect x='1' y='1' width='82' height='118' rx='10' ry='10' fill='#0d2f56' stroke='#f3e5ab' stroke-width='2'/>"
        + "<rect x='8' y='8' width='68' height='104' rx='8' ry='8' fill='none' stroke='#f3e5ab' stroke-width='1.5'/>"
        + "<path d='M16 18 L68 18 L68 102 L16 102 Z' fill='none' stroke='#a9c4e8' stroke-width='1' stroke-dasharray='4 3'/>"
        + "<circle cx='42' cy='60' r='16' fill='none' stroke='#f3e5ab' stroke-width='2'/>"
        + "<circle cx='42' cy='60' r='6' fill='#f3e5ab'/>"
        + "</svg>";

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function createAvatarDataUri(isBot) {
    const top = isBot ? "#9ad2ff" : "#ffd79f";
    const bottom = isBot ? "#4a90e2" : "#ff9b5c";
    const icon = isBot ? "BOT" : "YOU";

    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>"
        + "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
        + "<stop offset='0%' stop-color='" + top + "'/><stop offset='100%' stop-color='" + bottom + "'/></linearGradient></defs>"
        + "<rect x='2' y='2' width='60' height='60' rx='30' fill='url(#g)'/>"
        + "<circle cx='24' cy='27' r='4' fill='#1a1a1a'/><circle cx='40' cy='27' r='4' fill='#1a1a1a'/>"
        + "<rect x='20' y='37' width='24' height='5' rx='2.5' fill='#1a1a1a'/>"
        + "<text x='32' y='56' text-anchor='middle' font-size='9' fill='#ffffff' font-family='Verdana' font-weight='bold'>" + icon + "</text>"
        + "</svg>";

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function findStartingPlayerIndex() {
    const startCard = "7 of Diamonds";

    for (let i = 0; i < playerHands.length; i++) {
        if (playerHands[i].includes(startCard)) {
            return i;
        }
    }

    return 0;
}

function getCardRankValue(cardLabel) {
    const rank = getCardRank(cardLabel);
    return rankValue[rank] || 99;
}

function isHumanTurn() {
    return activePlayerIndex === 0;
}

function getSeatNameByPlayerIndex(playerIndex) {
    return seatByPlayerIndex[playerIndex] || seatOrder[playerIndex] || null;
}

function getAdjacentPlayerIndex(fromIndex, stepDirection) {
    if (playerNames.length <= 1) {
        return fromIndex;
    }

    const currentSeat = getSeatNameByPlayerIndex(fromIndex);
    if (!currentSeat) {
        return (fromIndex + stepDirection + playerNames.length) % playerNames.length;
    }

    let seatCursor = currentSeat;
    for (let step = 0; step < clockwiseSeatCycle.length; step++) {
        const currentSeatIndex = clockwiseSeatCycle.indexOf(seatCursor);
        if (currentSeatIndex === -1) {
            break;
        }

        const nextSeatIndex = (currentSeatIndex + stepDirection + clockwiseSeatCycle.length) % clockwiseSeatCycle.length;
        seatCursor = clockwiseSeatCycle[nextSeatIndex];

        const nextPlayerIndex = seatByPlayerIndex.indexOf(seatCursor);
        if (nextPlayerIndex !== -1 && nextPlayerIndex < playerNames.length) {
            return nextPlayerIndex;
        }
    }

    return (fromIndex + stepDirection + playerNames.length) % playerNames.length;
}

function getPreviousPlayerIndex() {
    if (playerNames.length === 0) {
        return -1;
    }

    return getAdjacentPlayerIndex(activePlayerIndex, -1);
}

function canCurrentPlayerCallOut() {
    if (!lastPlay || isGameOver || playerNames.length === 0) {
        return false;
    }

    return lastPlay.playerIndex === getPreviousPlayerIndex();
}

function addLogEntry(text) {
    if (!playLog) {
        return;
    }

    const item = document.createElement("li");
    item.textContent = text;
    playLog.prepend(item);

    while (playLog.children.length > 4) {
        playLog.removeChild(playLog.lastChild);
    }
}

function renderPlayerHand() {
    if (!playerHandContainer || !playerHandTitle) {
        return;
    }

    const yourHand = playerHands[0] || [];
    playerHandTitle.textContent = (playerNames[0] || "Your") + " Hand (" + yourHand.length + ")";
    playerHandContainer.innerHTML = "";

    for (const card of yourHand) {
        const cardImage = document.createElement("img");
        cardImage.className = "card-image selectable";
        if (selectedCards.has(card)) {
            cardImage.classList.add("selected");
        }
        cardImage.src = cardToDataUri(card);
        cardImage.alt = card;
        cardImage.title = card;

        cardImage.addEventListener("click", function () {
            if (!isHumanTurn() || isGameOver) {
                return;
            }

            if (selectedCards.has(card)) {
                selectedCards.delete(card);
            } else {
                selectedCards.add(card);
            }
            renderPlayerHand();
        });

        playerHandContainer.appendChild(cardImage);
    }
}

function getSeatCenterByPlayerIndex(playerIndex) {
    const seatName = seatByPlayerIndex[playerIndex];
    const seat = seatName ? tableSeats[seatName] : null;

    if (!seat) {
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    const avatar = seat.querySelector(".seat-avatar");
    const target = avatar || seat;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function addCardToCenterStack(cardLabel) {
    if (!centerPileVisual) {
        return;
    }

    const stackedCard = document.createElement("img");
    stackedCard.className = "center-pile-card";
    stackedCard.src = cardBackDataUri();
    stackedCard.alt = "Stacked card back";

    const offsetX = Math.floor((Math.random() - 0.5) * 70);
    const offsetY = Math.floor((Math.random() - 0.5) * 46);
    const rotate = Math.floor((Math.random() - 0.5) * 30);

    stackedCard.style.left = (centerPileVisual.clientWidth / 2 - 32 + offsetX) + "px";
    stackedCard.style.top = (centerPileVisual.clientHeight / 2 - 45 + offsetY) + "px";
    stackedCard.style.transform = "rotate(" + rotate + "deg)";
    stackedCard.style.zIndex = String(visualPileCount + 1);
    centerPileVisual.appendChild(stackedCard);
    visualPileCount += 1;

    if (centerPileVisual.children.length > 70) {
        centerPileVisual.removeChild(centerPileVisual.firstChild);
    }
}

function animatePlayedCardsToCenter(playerIndex, playedCards, sourceRects) {
    if (!centerPileVisual || !playedCards || playedCards.length === 0) {
        return;
    }

    const centerRect = centerPileVisual.getBoundingClientRect();
    const fallbackSource = getSeatCenterByPlayerIndex(playerIndex);

    playedCards.forEach(function (cardLabel, index) {
        const sourceRect = sourceRects && sourceRects[index] ? sourceRects[index] : null;
        const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : fallbackSource.x;
        const startY = sourceRect ? sourceRect.top + sourceRect.height / 2 : fallbackSource.y;

        const flyCard = document.createElement("img");
        flyCard.className = "flying-card";
        flyCard.src = cardBackDataUri();
        flyCard.alt = "Flying card back";

        flyCard.style.left = (startX - 32) + "px";
        flyCard.style.top = (startY - 45) + "px";
        flyCard.style.transform = "rotate(0deg) scale(1)";
        flyCard.style.opacity = "1";
        document.body.appendChild(flyCard);

        const targetX = centerRect.left + centerRect.width / 2 + (Math.random() - 0.5) * 44;
        const targetY = centerRect.top + centerRect.height / 2 + (Math.random() - 0.5) * 28;
        const targetRotate = Math.floor((Math.random() - 0.5) * 24);

        requestAnimationFrame(function () {
            flyCard.style.left = (targetX - 32) + "px";
            flyCard.style.top = (targetY - 45) + "px";
            flyCard.style.transform = "rotate(" + targetRotate + "deg) scale(0.95)";
        });

        setTimeout(function () {
            addCardToCenterStack(cardLabel);
            flyCard.remove();
        }, 470 + index * 35);
    });
}

function clearCenterPileVisual() {
    if (!centerPileVisual) {
        return;
    }

    centerPileVisual.innerHTML = "";
    visualPileCount = 0;
}

function highlightActiveSeat() {
    for (const seatName of seatOrder) {
        const seat = tableSeats[seatName];
        if (seat) {
            seat.classList.remove("active-turn");
        }
    }

    const activeSeatName = seatByPlayerIndex[activePlayerIndex];
    if (!activeSeatName) {
        return;
    }

    const activeSeat = tableSeats[activeSeatName];
    if (activeSeat) {
        activeSeat.classList.add("active-turn");
    }
}

function renderTablePlayers() {
    for (const seatName of seatOrder) {
        const seat = tableSeats[seatName];
        if (!seat) {
            continue;
        }

        seat.style.display = "none";
        seat.classList.remove("active-turn");
    }

    seatByPlayerIndex = [];

    for (let i = 0; i < playerNames.length && i < seatOrder.length; i++) {
        const seatName = seatOrder[i];
        const seat = tableSeats[seatName];
        if (!seat) {
            continue;
        }

        const isBot = playerNames[i].toLowerCase().includes("bot");
        const avatar = seat.querySelector(".seat-avatar");
        const seatLabel = seat.querySelector(".seat-name");
        const cardsLeft = (playerHands[i] || []).length;

        if (avatar) {
            avatar.src = createAvatarDataUri(isBot);
            avatar.alt = playerNames[i] + " avatar";
        }

        if (seatLabel) {
            seatLabel.textContent = playerNames[i] + " (" + cardsLeft + ")";
        }

        seat.style.display = "block";
        seatByPlayerIndex[i] = seatName;
    }

    highlightActiveSeat();
}

function updateTurnIndicator() {
    if (!turnIndicator) {
        return;
    }

    if (playerNames.length === 0) {
        turnIndicator.textContent = "Turn: -";
        return;
    }

    const currentPlayerName = playerNames[activePlayerIndex] || ("P" + (activePlayerIndex + 1));
    turnIndicator.textContent = "Turn: " + currentPlayerName;
    highlightActiveSeat();
}

function updateActionState() {
    const humanTurn = isHumanTurn() && !isGameOver;

    if (btnPlaySelected) {
        btnPlaySelected.disabled = !humanTurn;
    }

    if (claimRankSelect) {
        claimRankSelect.disabled = !humanTurn || currentCallRank !== null;
        if (currentCallRank !== null) {
            claimRankSelect.value = currentCallRank;
        }
    }

    if (btnSortHand) {
        btnSortHand.disabled = !humanTurn;
    }

    if (btnCallBluff) {
        btnCallBluff.disabled = !humanTurn || !canCurrentPlayerCallOut();

        if (canCurrentPlayerCallOut()) {
            const prevIndex = getPreviousPlayerIndex();
            const prevName = playerNames[prevIndex] || ("P" + (prevIndex + 1));
            btnCallBluff.textContent = "Call " + prevName;
        } else {
            btnCallBluff.textContent = "Call Bluff";
        }
    }
}

function nextTurn() {
    if (playerHands.length === 0) {
        return;
    }

    activePlayerIndex = getAdjacentPlayerIndex(activePlayerIndex, 1);
}

function checkWinner(playerIndex) {
    if ((playerHands[playerIndex] || []).length !== 0) {
        return false;
    }

    isGameOver = true;
    const winnerName = playerNames[playerIndex] || ("P" + (playerIndex + 1));
    cardDisplay.textContent = winnerName + " wins the game";
    addLogEntry(winnerName + " has emptied their hand and wins.");
    showWinAnimation(winnerName + " Wins", "Hand empty. Game over.");
    updateActionState();
    return true;
}

function registerPlay(playerIndex, playedCards, claimedRank, sourceRects) {
    const playerName = playerNames[playerIndex] || ("P" + (playerIndex + 1));
    const truthful = playedCards.every(function (card) {
        return getCardRank(card) === claimedRank;
    });

    centerPile.push.apply(centerPile, playedCards);

    if (currentCallRank === null) {
        currentCallRank = claimedRank;
    }

    const message = playerName + " played " + playedCards.length + " card(s) and says " + playedCards.length + "x " + currentCallRank;
    cardDisplay.textContent = message;
    if (lastCall) {
        lastCall.textContent = "Last call: " + playerName + " says " + playedCards.length + "x " + currentCallRank + " | Required rank: " + currentCallRank;
    }

    addLogEntry(message);

    animatePlayedCardsToCenter(playerIndex, playedCards, sourceRects);

    lastPlay = {
        playerIndex: playerIndex,
        claimedRank: currentCallRank,
        cards: playedCards.slice(),
        truthful: truthful
    };

    renderPlayerHand();
    renderTablePlayers();

    if (handleAllAcesLossIfNeeded()) {
        return;
    }

    const removedSets = removeFourOfKindForAllPlayers();
    if (removedSets.length > 0) {
        announceRemovedSets(removedSets);
        renderPlayerHand();
        renderTablePlayers();
    }

    if (checkWinner(playerIndex)) {
        return;
    }

    nextTurn();
    updateTurnIndicator();
    updateActionState();

    if (!isHumanTurn()) {
        setTimeout(playBotTurn, botTurnDelayMs);
    }
}

function sortMyHandByRank() {
    const yourHand = playerHands[0];
    if (!yourHand || yourHand.length === 0) {
        cardDisplay.textContent = "No cards to sort";
        return;
    }

    yourHand.sort(function (cardA, cardB) {
        return getCardRankValue(cardA) - getCardRankValue(cardB);
    });

    renderPlayerHand();
    cardDisplay.textContent = "Your hand sorted by rank";
}

function playSelectedCards() {
    if (!isHumanTurn() || isGameOver) {
        return;
    }

    const yourHand = playerHands[0] || [];
    const selected = Array.from(selectedCards);

    if (selected.length === 0) {
        cardDisplay.textContent = "Select at least one card";
        return;
    }

    const claimRank = currentCallRank || (claimRankSelect ? claimRankSelect.value : "A");
    const cardsToPlay = [];
    const sourceRects = selected
        .map(function (card) {
            const element = playerHandContainer ? playerHandContainer.querySelector("img[title='" + card + "']") : null;
            return element ? element.getBoundingClientRect() : null;
        })
        .filter(function (item) {
            return item !== null;
        });

    playerHands[0] = yourHand.filter(function (card) {
        if (selectedCards.has(card)) {
            cardsToPlay.push(card);
            return false;
        }
        return true;
    });

    selectedCards = new Set();
    registerPlay(0, cardsToPlay, claimRank, sourceRects);
}

function getRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function playBotTurn() {
    if (isGameOver || isHumanTurn()) {
        return;
    }

    if (canCurrentPlayerCallOut() && Math.random() < 0.3) {
        callPreviousPlayerBluff();
        return;
    }

    const botIndex = activePlayerIndex;
    const hand = playerHands[botIndex] || [];

    if (hand.length === 0) {
        if (checkWinner(botIndex)) {
            return;
        }

        nextTurn();
        updateTurnIndicator();
        updateActionState();
        if (!isHumanTurn()) {
            setTimeout(playBotTurn, botTurnDelayMs);
        }
        return;
    }

    const truthfulMove = Math.random() < 0.55;
    let playedCards = [];
    let claimRank = currentCallRank;

    if (!claimRank) {
        claimRank = getRandomItem(ranks);
    }

    if (truthfulMove) {
        const groupedByRank = {};
        for (const card of hand) {
            const rank = getCardRank(card);
            if (!groupedByRank[rank]) {
                groupedByRank[rank] = [];
            }
            groupedByRank[rank].push(card);
        }

        const calledGroup = groupedByRank[claimRank] || [];
        if (calledGroup.length > 0) {
            const playCount = 1 + Math.floor(Math.random() * Math.min(3, calledGroup.length));
            playedCards = calledGroup.slice(0, playCount);
        }
    }

    if (playedCards.length === 0) {
        const maxCount = Math.min(3, hand.length);
        const playCount = 1 + Math.floor(Math.random() * maxCount);
        const handCopy = hand.slice();

        for (let i = 0; i < playCount; i++) {
            const pickIndex = Math.floor(Math.random() * handCopy.length);
            playedCards.push(handCopy.splice(pickIndex, 1)[0]);
        }
    } else {
        claimRank = claimRank;
    }

    playerHands[botIndex] = hand.filter(function (card) {
        return !playedCards.includes(card);
    });

    registerPlay(botIndex, playedCards, claimRank, null);
}

function callPreviousPlayerBluff() {
    if (!canCurrentPlayerCallOut()) {
        if (isHumanTurn()) {
            cardDisplay.textContent = "You can only call the player before you";
        }
        return;
    }

    const challengerIndex = activePlayerIndex;
    const previousIndex = getPreviousPlayerIndex();
    const challengerName = playerNames[challengerIndex] || ("P" + (challengerIndex + 1));
    const previousName = playerNames[previousIndex] || ("P" + (previousIndex + 1));
    const liarCaught = !lastPlay.truthful;

    const pileReceiverIndex = liarCaught ? previousIndex : challengerIndex;
    const pileReceiverName = playerNames[pileReceiverIndex] || ("P" + (pileReceiverIndex + 1));
    const pileSize = centerPile.length;

    playerHands[pileReceiverIndex] = (playerHands[pileReceiverIndex] || []).concat(centerPile);

    if (handleAllAcesLossIfNeeded()) {
        centerPile = [];
        clearCenterPileVisual();
        lastPlay = null;
        currentCallRank = null;
        if (lastCall) {
            lastCall.textContent = "Last call: none | Required rank: not set";
        }
        return;
    }

    const removedSets = removeFourOfKindForAllPlayers();

    if (liarCaught) {
        cardDisplay.textContent = challengerName + " called bluff on " + previousName + " and was right. " + previousName + " takes " + pileSize + " cards.";
        addLogEntry(challengerName + " called " + previousName + " and was right. " + previousName + " took the pile.");
    } else {
        cardDisplay.textContent = challengerName + " called bluff on " + previousName + " but was wrong. " + challengerName + " takes " + pileSize + " cards.";
        addLogEntry(challengerName + " called " + previousName + " and was wrong. " + challengerName + " took the pile.");
    }

    centerPile = [];
    clearCenterPileVisual();
    lastPlay = null;
    currentCallRank = null;
    if (lastCall) {
        lastCall.textContent = "Last call: none | Required rank: not set";
    }

    if (removedSets.length > 0) {
        announceRemovedSets(removedSets);
    }

    renderPlayerHand();
    renderTablePlayers();

    if (liarCaught) {
        nextTurn();
    } else {
        // If the caller is wrong, the truthful previous player starts next.
        activePlayerIndex = previousIndex;
    }

    updateTurnIndicator();
    updateActionState();

    if (!isHumanTurn() && !isGameOver) {
        setTimeout(playBotTurn, botTurnDelayMs);
    }
}

function startGame(modeTitle, names) {
    mainMenu.style.display = "none";
    gameBoard.style.display = "block";
    gameModeTitle.textContent = modeTitle;

    isGameOver = false;
    hideWinAnimation();
    centerPile = [];
    clearCenterPileVisual();
    currentCallRank = null;
    lastPlay = null;
    selectedCards = new Set();
    playerNames = names;
    if (playLog) {
        playLog.innerHTML = "";
    }

    dealAllCards(playerNames.length);

    if (handleAllAcesLossIfNeeded()) {
        return;
    }

    const removedSets = removeFourOfKindForAllPlayers();
    activePlayerIndex = findStartingPlayerIndex();

    renderPlayerHand();
    renderTablePlayers();
    updateTurnIndicator();
    updateActionState();

    const starterName = playerNames[activePlayerIndex] || ("P" + (activePlayerIndex + 1));
    cardDisplay.textContent = starterName + " begins (has 7 of Diamonds)";
    if (lastCall) {
        lastCall.textContent = "Last call: none | Required rank: not set";
    }

    if (removedSets.length > 0) {
        announceRemovedSets(removedSets);
    }

    addLogEntry(starterName + " starts because they hold 7 of Diamonds.");

    if (!isHumanTurn()) {
        setTimeout(playBotTurn, botTurnDelayMs);
    }
}

btnSingleplayer.addEventListener("click", function () {
    startGame("Singleplayer", ["You", "Bot 1", "Bot 2", "Bot 3"]);
});

btnMultiplayer.addEventListener("click", function () {
    startGame("Multiplayer", ["Player 1", "Player 2"]);
});

if (btnSortHand) {
    btnSortHand.addEventListener("click", sortMyHandByRank);
}

if (btnPlaySelected) {
    btnPlaySelected.addEventListener("click", playSelectedCards);
}

if (btnCallBluff) {
    btnCallBluff.addEventListener("click", callPreviousPlayerBluff);
}
});