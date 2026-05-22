// Action library lookup utilities — BRD §15.4.

const { ACTION_LIBRARY } = require('../data/rules');

function lookupAction(actionTrigger) {
  return ACTION_LIBRARY[actionTrigger] || null;
}

function listAllActions() {
  return Object.entries(ACTION_LIBRARY).map(([key, v]) => ({ key, ...v }));
}

module.exports = { lookupAction, listAllActions };
