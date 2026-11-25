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
    "[shrug] Noted. I'll pass that along if I ever see them again.",
    "[facepalm] Bold of you to reply to a helmet.",
    "[point] I delivered the message. This part is extra.",
    "[think] Understood. My face is doing nothing, in case that wasn't clear.",
    "[sad] Okay. That's a sentence I will now carry.",
    "[wave] Copy. Standing here. Not dancing. Don't start.",
  ],
  hype: [
    "[celebrate] YES. I heard you. The stars heard you.",
    "[dance] Okay okay okay. I am telling them with my WHOLE chest.",
    "[laugh] This is the best reply a helmet has ever received.",
    "[point] I am vibrating. Jetpack or your message. Yes.",
    "[celebrate] They are going to lose it. In a good way. Probably.",
    "[wave] Say less. I already said more. I'm going back.",
  ],
  dramatic: [
    "[bow] And thus, a reply crossed the dark.",
    "[think] I shall carry these words like a fragile moon.",
    "[sad] The visor fogged. That is how you know it mattered.",
    "[point] History will misquote this, but I will not.",
    "[facepalm] Speak again, if you dare. I am already changed.",
    "[celebrate] A single sentence, and the orbit shifted.",
  ],
  sarcastic: [
    "[shrug] Wow. A reply. The mission writes itself.",
    "[point] I'll tell them. Try to contain your legend.",
    "[facepalm] Incredible. You used words. I don't have a gold star.",
    "[think] Sure. I'll squeeze that in between the vacuum.",
    "[sad] They sent me for this and now I'm a middleman with legs.",
    "[laugh] Noted, with the enthusiasm of a parked rover.",
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
