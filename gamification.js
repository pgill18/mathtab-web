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
      "id": "daily-challenge",
      "name": "Daily Challenge",
      "description": "A single goal that rotates every calendar day (distinct from the weekly Quests); complete it for a small XP bonus.",
      "default": true,
      "hooks": [
        "onCorrectAnswer",
        "onMasteryChange",
        "onLadderWin",
        "onDailyFirstPlay"
      ],
      "config": {
        "challenges": [
          {
            "id": "daily-sharp",
            "name": "Sharp Fifteen",
            "desc": "Answer 15 correct today",
            "metric": "correct",
            "target": 15,
            "reward_xp": 25
          },
          {
            "id": "daily-duel",
            "name": "Daily Duel",
            "desc": "Beat one rival today",
            "metric": "ladder",
            "target": 1,
            "reward_xp": 25
          },
          {
            "id": "daily-mastery",
            "name": "Daily Mastery",
            "desc": "Master 2 cells today",
            "metric": "mastered",
            "target": 2,
            "reward_xp": 25
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
    },
    {
      "id": "unlockable-themes",
      "name": "Unlockable Themes",
      "description": "Unlock alternate visual themes by hitting gamification milestones, then pick one in Settings (webapp only).",
      "default": true,
      "hooks": [],
      "config": {
        "themes": [
          { "id": "hall", "name": "Training Hall", "unlock": null },
          { "id": "night", "name": "Night Session", "unlock": { "type": "streak", "days": 7 }, "hint": "Unlock: 7-day streak" },
          { "id": "forge", "name": "Forge", "unlock": { "type": "badge", "id": "row-runner" }, "hint": "Unlock: master a full row" },
          { "id": "blueprint", "name": "Blueprint", "unlock": { "type": "badge", "id": "flawless" }, "hint": "Unlock: finish a drill at 100%" }
        ]
      }
    }
  ]
};
