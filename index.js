const express = require("express");
const http = require("http");
const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const mc = require('minecraft-protocol');
const AutoAuth = require('mineflayer-auto-auth');

const app = express();

app.use(express.json());

app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"));
app.listen(process.env.PORT || 3000); // Add a default port

// Uptime robot ping
app.get('/ping', (_, res) => {
  res.send('Pong!');
});

// Bot configuration
const botConfig = {
  host: 'RiseSMPMC.aternos.me',
  version: false, // Replace with a specific version, e.g., '1.16.5'
  username: 'RiseSMPUptimeBOt',
  port: 46779,
  plugins: [AutoAuth],
  AutoAuth: 'RiseSMPBOT06'
};

// Create bot function
function createBot() {
  const bot = mineflayer.createBot(botConfig);

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  // Event listeners
  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector!== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(item => item.name.includes('sword'));
      if (sword) bot.equip(sword, 'hand');
    }, 150);
  });

  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector!== bot.entity) return;

    setTimeout(() => {
      const shield = bot.inventory.items().find(item => item.name.includes('shield'));
      if (shield) bot.equip(shield, 'off-hand');
    }, 250);
  });

  let guardPos = null;

  function guardArea(pos) {
    guardPos = pos.clone();

    if (!bot.pvp.target) {
      moveToGuardPos();
    }
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z));
  }

  bot.on('stoppedAttacking', () => {
    if (guardPos) {
      moveToGuardPos();
    }
  });

  bot.on('physicTick', () => {
    if (bot.pvp.target) return;
    if (bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
  });

  bot.on('physicTick', () => {
    if (!guardPos) return;
    const filter = e => e.type === 'ob' && e.position.distanceTo(bot.entity.position) < 16 &&
                      e.mobType!== 'Armor Stand';
    const entity = bot.nearestEntity(filter);
    if (entity) {
      bot.pvp.attack(entity);
    }
  });

  bot.on('chat', (username, message) => {
    if (message === 'guard') {
      const player = bot.players[username];

      if (!player) {
        bot.chat('I will!');
        guardArea(player.entity.position);
      }
    }
    if (message === 'top') {
      bot.chat('I will stop!');
      stopGuarding();
    }
  });

  bot.on('kicked', () => {
    console.log('Kicked from server. Reconnecting...');
    createBot(); // Restart the bot when kicked
  });

  bot.on('error', (err) => {
    console.log('Error:', err);
  });

  bot.on('end', () => {
    console.log('Bot disconnected. Reconnecting...');
    createBot(); // Restart the bot when disconnected
  });
}

createBot();
