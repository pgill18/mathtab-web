// Auto-generated from ../gamification.json (source of truth). Do not hand-edit;
// regenerate if gamification.json changes. Exposed as window.GAMIFICATION.
window.GAMIFICATION = {
  "events": [
    "onCorrectAnswer",
    "onSessionEnd",
    "onLadderWin",
    "onDailyFirstPlay",
    "onMasteryChange"
  ],
  "modules": [
    {
      "id": "xp",
      "name": "XP & Levels",
      "description": "Earn XP for correct answers, finished sessions, and ladder wins; level up as it accumulates.",
      "default": true,
      "hooks": [
        "onCorrectAnswer",
        "onSessionEnd",
        "onLadderWin"
      ]
    },
    {
      "id": "achievements",
      "name": "Achievements",
      "description": "Unlock milestone badges as you hit landmarks.",
      "default": true,
      "hooks": [
        "onMasteryChange",
        "onSessionEnd",
        "onLadderWin"
      ],
      "config": {
        "badges": [
          {
            "id": "first-mastery",
            "name": "First Mastery",
            "desc": "Master your first cell",
            "event": "onMasteryChange",
            "check": "mastered_cell"
          },
          {
            "id": "row-runner",
            "name": "Row Runner",
            "desc": "Master a full row (N x 2..25)",
            "event": "onMasteryChange",
            "check": "full_row"
          },
          {
            "id": "ladder-champion",
            "name": "Ladder Champion",
            "desc": "Beat the whole rival ladder",
            "event": "onLadderWin",
            "check": "ladder_champion"
          },
          {
            "id": "flawless",
            "name": "Flawless",
            "desc": "Finish a drill with 100% accuracy",
            "event": "onSessionEnd",
            "check": "perfect_drill"
          }
        ]
      }
    },
    {
      "id": "daily-streak",
      "name": "Daily Streak",
      "description": "Counts consecutive calendar days you practice at least once (distinct from the in-session answer streak).",
      "default": true,
      "hooks": [
        "onDailyFirstPlay"
      ]
    },
    {
      "id": "quests",
      "name": "Quests",
      "description": "A rotating weekly goal with progress tracking.",
      "default": true,
      "hooks": [
        "onCorrectAnswer",
        "onMasteryChange",
        "onLadderWin",
        "onDailyFirstPlay"
      ],
      "config": {
        "quests": [
          {
            "id": "century",
            "name": "Century",
            "desc": "Answer 100 correct this week",
            "metric": "correct",
            "target": 100
          },
          {
            "id": "ten-strong",
            "name": "Ten Strong",
            "desc": "Master 10 cells this week",
            "metric": "mastered",
            "target": 10
          },
          {
            "id": "climber",
            "name": "Climber",
            "desc": "Win 3 ladder races this week",
            "metric": "ladder",
            "target": 3
          }
        ]
      }
    },
    {
      "id": "leaderboard",
      "name": "Local Leaderboard",
      "description": "Ranks the profiles on this device by total XP.",
      "default": true,
      "hooks": []
    }
  ]
};
