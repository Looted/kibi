// Offline fixtures pin the historical default models. Isolate this test process
// from the operator's campaign configuration; paid commands never preload this.
// implements REQ-skillopt-paid-launch-accounting
for (const key of [
  "KIBI_SKILLOPT_TARGET_MODEL",
  "KIBI_SKILLOPT_TARGET_EFFORT",
  "KIBI_SKILLOPT_OPTIMIZER_MODEL",
  "KIBI_SKILLOPT_OPTIMIZER_EFFORT",
  "KIBI_SKILLOPT_MODEL_PRICING",
]) {
  delete process.env[key];
}
