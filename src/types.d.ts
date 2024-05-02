type Session = {
  deviceId: string;
  persona: string;
  arkose: {
    required: boolean;
    dx: any;
  };
  turnstile: {
    required: boolean;
  };
  proofofwork: {
    required: boolean;
    seed: string;
    difficulty: string;
  };
  token: string;
};
