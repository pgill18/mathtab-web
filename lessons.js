// Auto-generated from ../lessons.json (source of truth). Do not hand-edit;
// regenerate if lessons.json changes. Exposed as window.LESSONS.
window.LESSONS = [
  {
    "id": "even-times-anything-is-even",
    "title": "Even x anything is even (parity check)",
    "explanation": "If either number you multiply is even, the product is ALWAYS even (ends in 0,2,4,6,8). Use this as a fast sanity check: if you compute an even x something and land on an odd answer, you made a slip. The product is odd ONLY when both numbers are odd.",
    "examples": [
      "8 x 7: 8 is even -> answer must be even. 56. Ends in 6, good.",
      "6 x 9 = 54. 6 is even so it's even; if you'd said 53 you'd know it was wrong.",
      "3 x 5 = 15: both odd, so this one is allowed to be odd."
    ],
    "pool": [
      [
        2,
        7
      ],
      [
        4,
        6
      ],
      [
        8,
        3
      ],
      [
        6,
        9
      ],
      [
        10,
        7
      ],
      [
        12,
        5
      ],
      [
        14,
        3
      ],
      [
        2,
        25
      ],
      [
        16,
        4
      ],
      [
        18,
        5
      ],
      [
        22,
        3
      ],
      [
        24,
        7
      ]
    ]
  },
  {
    "id": "x5-is-half-of-x10",
    "title": "x5 is half of x10",
    "explanation": "To multiply by 5, multiply by 10 (append a 0) and halve it. Times-10 is trivial, and halving is easy. Works for any number.",
    "examples": [
      "5 x 8: 8 x 10 = 80, half = 40.",
      "5 x 14: 14 x 10 = 140, half = 70.",
      "5 x 17: 17 x 10 = 170, half = 85."
    ],
    "pool": [
      [
        5,
        4
      ],
      [
        5,
        7
      ],
      [
        5,
        9
      ],
      [
        5,
        11
      ],
      [
        5,
        13
      ],
      [
        5,
        16
      ],
      [
        5,
        19
      ],
      [
        5,
        22
      ],
      [
        5,
        24
      ],
      [
        5,
        3
      ]
    ]
  },
  {
    "id": "x9-digit-pattern",
    "title": "x9 digit pattern",
    "explanation": "To multiply n x 9, compute n x 10 - n (ten of them minus one). For single-digit n the two digits of the answer add to 9, and the tens digit is n-1. This gives an instant check.",
    "examples": [
      "9 x 7: 70 - 7 = 63 (6+3 = 9).",
      "9 x 4: 40 - 4 = 36 (3+6 = 9).",
      "9 x 12: 120 - 12 = 108."
    ],
    "pool": [
      [
        9,
        3
      ],
      [
        9,
        4
      ],
      [
        9,
        6
      ],
      [
        9,
        7
      ],
      [
        9,
        8
      ],
      [
        9,
        11
      ],
      [
        9,
        12
      ],
      [
        9,
        2
      ]
    ]
  },
  {
    "id": "x11-two-digit-trick",
    "title": "x11 two-digit trick",
    "explanation": "For a single digit d, d x 11 just repeats the digit: 3 -> 33, 7 -> 77. For a two-digit number ab, ab x 11 = a (a+b) b, i.e. add the two digits and drop the sum in the middle (carry if it exceeds 9).",
    "examples": [
      "11 x 7 = 77.",
      "11 x 13: 1_(1+3)_3 = 143.",
      "11 x 25: 2_(2+5)_5 = 275."
    ],
    "pool": [
      [
        11,
        3
      ],
      [
        11,
        5
      ],
      [
        11,
        7
      ],
      [
        11,
        8
      ],
      [
        11,
        2
      ],
      [
        11,
        9
      ],
      [
        11,
        6
      ],
      [
        11,
        13
      ]
    ]
  },
  {
    "id": "x4-double-double",
    "title": "x4 = double, then double again",
    "explanation": "Multiplying by 4 is doubling twice. Doubling is one of the easiest operations, so break x4 into two doublings.",
    "examples": [
      "4 x 7: double 7 = 14, double again = 28.",
      "4 x 13: double = 26, double = 52.",
      "4 x 18: double = 36, double = 72."
    ],
    "pool": [
      [
        4,
        6
      ],
      [
        4,
        7
      ],
      [
        4,
        8
      ],
      [
        4,
        9
      ],
      [
        4,
        12
      ],
      [
        4,
        13
      ],
      [
        4,
        15
      ],
      [
        4,
        3
      ],
      [
        4,
        17
      ]
    ]
  },
  {
    "id": "x25-quarter-of-x100",
    "title": "x25 is a quarter of x100",
    "explanation": "To multiply by 25, multiply by 100 (append two zeros) and take a quarter (halve twice). Fast because x100 is trivial and halving twice is easy.",
    "examples": [
      "25 x 8: 800 / 4 = 200.",
      "25 x 12: 1200 / 4 = 300.",
      "25 x 7: 700 / 4 = 175."
    ],
    "pool": [
      [
        25,
        3
      ],
      [
        25,
        4
      ],
      [
        25,
        6
      ],
      [
        25,
        8
      ],
      [
        25,
        7
      ],
      [
        25,
        12
      ],
      [
        25,
        2
      ],
      [
        25,
        9
      ]
    ]
  },
  {
    "id": "squares-as-anchors",
    "title": "Squares as anchors (n^2 and neighbours)",
    "explanation": "Memorise the perfect squares (n x n) firmly. They are anchors: once you know n^2 you can reach neighbours cheaply. n x (n+1) = n^2 + n, and n x (n-1) = n^2 - n.",
    "examples": [
      "7 x 7 = 49, so 7 x 8 = 49 + 7 = 56.",
      "12 x 12 = 144, so 12 x 13 = 144 + 12 = 156.",
      "13 x 13 = 169, so 13 x 12 = 169 - 13 = 156."
    ],
    "pool": [
      [
        6,
        6
      ],
      [
        7,
        7
      ],
      [
        8,
        8
      ],
      [
        9,
        9
      ],
      [
        12,
        12
      ],
      [
        13,
        13
      ],
      [
        15,
        15
      ],
      [
        4,
        4
      ],
      [
        11,
        11
      ],
      [
        14,
        14
      ]
    ]
  },
  {
    "id": "commutativity-halves-the-table",
    "title": "Commutativity halves the table",
    "explanation": "a x b = b x a. You never need to learn both orders. Whenever a product feels awkward one way, flip it: pick the order you find easier to reason about (often the smaller or rounder number as the multiplier).",
    "examples": [
      "3 x 17 feels big; 17 x 3 = 51 is just three 17s.",
      "8 x 4 or 4 x 8 -> same 32; use whichever you know.",
      "6 x 9 = 9 x 6 = 54."
    ],
    "pool": [
      [
        3,
        17
      ],
      [
        17,
        3
      ],
      [
        4,
        13
      ],
      [
        13,
        4
      ],
      [
        6,
        9
      ],
      [
        9,
        6
      ],
      [
        7,
        3
      ],
      [
        3,
        8
      ]
    ]
  },
  {
    "id": "break-into-easy-products",
    "title": "Break into easy products (distribute)",
    "explanation": "Split an awkward multiply into a round part plus a small part: a x b = a x (b-k) + a x k. Choose k so one piece is trivial (usually landing on a x5 or x10).",
    "examples": [
      "17 x 6 = 17 x 5 + 17 = 85 + 17 = 102.",
      "13 x 7 = 13 x 5 + 13 x 2 = 65 + 26 = 91.",
      "18 x 4 = 18 x 2 + 18 x 2 = 36 + 36 = 72."
    ],
    "pool": [
      [
        17,
        6
      ],
      [
        13,
        7
      ],
      [
        18,
        4
      ],
      [
        14,
        6
      ],
      [
        16,
        7
      ],
      [
        19,
        3
      ],
      [
        23,
        4
      ],
      [
        17,
        8
      ]
    ]
  },
  {
    "id": "x12-is-x10-plus-x2",
    "title": "x12 = x10 + x2",
    "explanation": "To multiply by 12, take ten of the number plus two of the number. x10 is trivial and x2 is a double, so add them.",
    "examples": [
      "12 x 7: 70 + 14 = 84.",
      "12 x 9: 90 + 18 = 108.",
      "12 x 13: 130 + 26 = 156."
    ],
    "pool": [
      [
        12,
        3
      ],
      [
        12,
        4
      ],
      [
        12,
        6
      ],
      [
        12,
        7
      ],
      [
        12,
        8
      ],
      [
        12,
        9
      ],
      [
        12,
        11
      ],
      [
        12,
        13
      ]
    ]
  },
  {
    "id": "difference-of-squares-near-squares",
    "title": "Difference of squares (near a square)",
    "explanation": "When the two numbers straddle a square symmetrically, use (m-1)(m+1) = m^2 - 1, and more generally (m-k)(m+k) = m^2 - k^2. Anchor on the square in the middle.",
    "examples": [
      "14 x 16 = 15^2 - 1 = 225 - 1 = 224.",
      "11 x 13 = 12^2 - 1 = 144 - 1 = 143.",
      "9 x 11 = 10^2 - 1 = 99."
    ],
    "pool": [
      [
        14,
        16
      ],
      [
        11,
        13
      ],
      [
        9,
        11
      ],
      [
        6,
        8
      ],
      [
        12,
        14
      ],
      [
        7,
        9
      ],
      [
        4,
        6
      ],
      [
        17,
        19
      ]
    ]
  }
];
