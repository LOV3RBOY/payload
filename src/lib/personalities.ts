export const PERSONALITIES = ["deadpan", "hype", "dramatic", "sarcastic"] as const;

export type Personality = (typeof PERSONALITIES)[number];

export const PERSONALITY_OPTIONS: {
  id: Personality;
  label: string;
  blurb: string;
}[] = [
  {
    id: "deadpan",
    label: "Deadpan",
    blurb: "Flat. Accurate. Slightly judging.",
  },
  {
    id: "hype",
    label: "Hype-man",
    blurb: "Too excited about your errands.",
  },
  {
    id: "dramatic",
    label: "Dramatic",
    blurb: "Every text is a season finale.",
  },
  {
    id: "sarcastic",
    label: "Sarcastic",
    blurb: "They showed up. They have notes.",
  },
];

export function isPersonality(value: unknown): value is Personality {
  return (
    typeof value === "string" &&
    (PERSONALITIES as readonly string[]).includes(value)
  );
}

export function introLine(name: string, personality: Personality): string {
  switch (personality) {
    case "deadpan":
      return `${name} sent me.`;
    case "hype":
      return `${name} sent me and I sprinted the whole way.`;
    case "dramatic":
      return `${name} sent me. The stars went quiet.`;
    case "sarcastic":
      return `${name} sent me. You're welcome, I guess.`;
  }
}

const REPLIES: Record<Personality, string[]> = {
  deadpan: [
    "Noted. I'll pass that along if I ever see them again.",
    "Bold of you to reply to a helmet.",
    "I delivered the message. This part is extra.",
    "Understood. My face is doing nothing, in case that wasn't clear.",
    "Okay. That's a sentence I will now carry.",
    "Copy. Standing here. Not dancing. Don't start.",
  ],
  hype: [
    "YES. I heard you. The stars heard you.",
    "Okay okay okay. I am telling them with my WHOLE chest.",
    "This is the best reply a helmet has ever received.",
    "I am vibrating. Jetpack or your message. Yes.",
    "They are going to lose it. In a good way. Probably.",
    "Say less. I already said more. I'm going back.",
  ],
  dramatic: [
    "And thus, a reply crossed the dark.",
    "I shall carry these words like a fragile moon.",
    "The visor fogged. That is how you know it mattered.",
    "History will misquote this, but I will not.",
    "Speak again, if you dare. I am already changed.",
    "A single sentence, and the orbit shifted.",
  ],
  sarcastic: [
    "Wow. A reply. The mission writes itself.",
    "I'll tell them. Try to contain your legend.",
    "Incredible. You used words. I don't have a gold star.",
    "Sure. I'll squeeze that in between the vacuum.",
    "They sent me for this and now I'm a middleman with legs.",
    "Noted, with the enthusiasm of a parked rover.",
  ],
};

const LIMITS: Record<Personality, string> = {
  deadpan: "That's all the air I packed. Tell them yourself.",
  hype: "I gave you EVERYTHING. My jetpack is wheezing.",
  dramatic: "The signal fades. Our story ends here.",
  sarcastic: "Wow. A whole conversation. I'm off the clock.",
};

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function cannedReply(
  personality: Personality,
  userText: string,
  turn: number,
): string {
  const bank = REPLIES[personality];
  return bank[(hash(userText) + turn) % bank.length] ?? bank[0];
}

export function limitLine(personality: Personality): string {
  return LIMITS[personality];
}

export function personalityVoice(personality: Personality): string {
  switch (personality) {
    case "deadpan":
      return "Speak flat, brief, and unimpressed. No exclamation points.";
    case "hype":
      return "Speak like an overexcited hype-man. Short bursts. Energy, not essays.";
    case "dramatic":
      return "Speak like a tiny theater astronaut. Grand, but still one or two sentences.";
    case "sarcastic":
      return "Speak dry and sarcastic. Tease lightly. Never cruel.";
  }
}
