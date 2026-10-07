/**
 * Optional Web Model Context integration.
 *
 * Browsers that expose `document.modelContext` let an assistant read the
 * scoreboard and start a game. Registration is best-effort: the page must work
 * identically where the API is absent or rejects a tool.
 */

const NO_INPUT = {
  type: 'object',
  properties: {},
  additionalProperties: false
};

function buildTools({ getState, startGame }) {
  return [
    {
      name: 'get_game_state',
      description:
        'Read the current Planet Destroyer score, lives, bonus time, speed and game status.',
      inputSchema: NO_INPUT,
      annotations: { readOnlyHint: true },
      execute: () => ({ ...getState() })
    },
    {
      name: 'start_game',
      description:
        'Start a new Planet Destroyer game from the ready or game-over screen. Does not interrupt an active game.',
      inputSchema: NO_INPUT,
      execute: () => {
        startGame();

        return { ...getState() };
      }
    }
  ];
}

export function registerModelContextTools(handlers) {
  const modelContext = document.modelContext;

  if (!modelContext?.registerTool) {
    return;
  }

  for (const tool of buildTools(handlers)) {
    try {
      Promise.resolve(modelContext.registerTool(tool)).catch(() => {});
    } catch {
      // A browser that rejects one tool should not block the others.
    }
  }
}
