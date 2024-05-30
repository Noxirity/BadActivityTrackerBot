const os = require("os");

function monitorUsages(client) {
  function calculateCPUUsage() {
    const cpus = os.cpus();
    const cpu = cpus[0];
    const idle = cpu.times.idle;
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);

    return { totalIdle: idle, totalTick: total };
  }

  let startMeasures = calculateCPUUsage();
  function getCPUUsage() {
    const endMeasures = calculateCPUUsage();
    const idleDifference = endMeasures.totalIdle - startMeasures.totalIdle;
    const totalDifference = endMeasures.totalTick - startMeasures.totalTick;
    const percentageCPU =
      100 - Math.floor((100 * idleDifference) / totalDifference);
    startMeasures = endMeasures;
    return percentageCPU;
  }

  function getRAMUsage() {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMem = totalMem - freeMem;
    const percentageRAM = Math.floor((usedMem / totalMem) * 100);
    return percentageRAM;
  }

  setInterval(() => {
    const cpuUsage = getCPUUsage();
    const ramUsage = getRAMUsage();
    client.cpuUsage = cpuUsage;
    client.ramUsage = ramUsage;
  }, 3000);
}

module.exports = monitorUsages;
