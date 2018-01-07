import {ErrorMapper} from "utils/ErrorMapper";

function roleBuilder(creep: Creep) {
  if (creep.memory.building && creep.carry.energy === 0) {
    creep.memory.building = false;
    creep.say("🔄 harvest");
  }
  if (!creep.memory.building && creep.carry.energy === creep.carryCapacity) {
    creep.memory.building = true;
    creep.say("🚧 build");
  }

  if (creep.memory.building) {
    const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (targets.length) {
      if (creep.build(targets[0]) === ERR_NOT_IN_RANGE) {
        creep.moveTo(targets[0], {visualizePathStyle: {stroke: "#ffffff"}});
      }
    }
  } else {
    const sources = creep.room.find(FIND_SOURCES);
    if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
      creep.moveTo(sources[0], {visualizePathStyle: {stroke: "#ffaa00"}});
    }
  }
}

function roleHarvester(creep: Creep) {
  if (creep.carry.energy < creep.carryCapacity) {
    const sources = creep.room.find(FIND_SOURCES);
    if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
      creep.moveTo(sources[0], {visualizePathStyle: {stroke: "#ffaa00"}});
    }
  } else {
    const targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) &&
          structure.energy < structure.energyCapacity;
      }
    });
    if (targets.length > 0) {
      if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(targets[0], {visualizePathStyle: {stroke: "#ffffff"}});
      }
    }
  }
}

function roleUpgrader(creep: Creep) {

  if (creep.memory.upgrading && creep.carry.energy === 0) {
    creep.memory.upgrading = false;
    creep.say("🔄 harvest");
  }
  if (!creep.memory.upgrading && creep.carry.energy === creep.carryCapacity) {
    creep.memory.upgrading = true;
    creep.say("⚡ upgrade");
  }

  if (creep.memory.upgrading) {
    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
      creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: "#ffffff"}});
    }
  } else {
    const sources = creep.room.find(FIND_SOURCES);
    if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
      creep.moveTo(sources[0], {visualizePathStyle: {stroke: "#ffaa00"}});
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// noinspection JSUnusedGlobalSymbols
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  const towers = _.filter(Game.structures, (structure) => structure.structureType === STRUCTURE_TOWER);
  for (const tower in towers) {
    const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (structure) => structure.hits < structure.hitsMax
    });
    if (closestDamagedStructure) {
      tower.repair(closestDamagedStructure);
      console.log("Tower is repairing");
    }

    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      tower.attack(closestHostile);
      console.log("Tower is attacking!");
    }
  }

  if (!Game.spawns.Spawn1.spawning) {
    const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === "harvester");
    const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === "upgrader");
    const builders = _.filter(Game.creeps, (creep) => creep.memory.role === "builder");

    if (harvesters.length < 2) {
      const newName = "Harvester" + Game.time;
      console.log("Spawning new harvester: " + newName);
      Game.spawns.Spawn1.spawnCreep([WORK, CARRY, MOVE], newName,
        {memory: {role: "harvester"}});
    } else if (upgraders.length < 2) {
      const newName = "Upgrader" + Game.time;
      console.log("Spawning new upgrader: " + newName);
      Game.spawns.Spawn1.spawnCreep([WORK, CARRY, MOVE], newName,
        {memory: {role: "upgrader"}});
    } else if (builders.length < 2) {
      const newName = "Builder" + Game.time;
      console.log("Spawning new builder: " + newName);
      Game.spawns.Spawn1.spawnCreep([WORK, CARRY, MOVE], newName,
        {memory: {role: "builder"}});
    }
  }

  if (Game.spawns.Spawn1.spawning) {
    const spawningCreep = Game.creeps[Game.spawns.Spawn1.spawning.name];
    Game.spawns.Spawn1.room.visual.text(
      "🛠️" + spawningCreep.memory.role,
      Game.spawns.Spawn1.pos.x + 1,
      Game.spawns.Spawn1.pos.y,
      {align: "left", opacity: 0.8});
  }

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role === "harvester") {
      roleHarvester(creep);
    } else if (creep.memory.role === "upgrader") {
      roleUpgrader(creep);
    } else if (creep.memory.role === "builder") {
      roleBuilder(creep);
    }
  }
});
