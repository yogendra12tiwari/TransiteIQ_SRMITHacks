export const enAlerts = {
  delay: (busId: string, routeName: string, delayMin: number): string =>
    `Bus ${busId} on route ${routeName} is running ${delayMin} min behind schedule.`,
  stall: (busId: string, stallMin: number): string =>
    `Bus ${busId} has been stationary for ${stallMin} min away from any stop.`,
  likelySkip: (busId: string, stopName: string): string =>
    `Bus ${busId} is likely to skip ${stopName} due to corridor congestion and schedule recovery.`,
  ghost: (routeName: string, ghostMin: number): string =>
    `Scheduled departure on route ${routeName} has no live tracking report (${ghostMin} min past departure).`,
};

export const hiAlerts = {
  delay: (busId: string, routeName: string, delayMin: number): string =>
    `रूट ${routeName} पर बस ${busId} निर्धारित समय से ${delayMin} मिनट पीछे चल रही है।`,
  stall: (busId: string, stallMin: number): string =>
    `बस ${busId} किसी भी स्टॉप से दूर ${stallMin} मिनट से रुकी हुई है।`,
  likelySkip: (busId: string, stopName: string): string =>
    `कॉरिडोर में भीड़ और शेड्यूल रिकवरी के कारण बस ${busId} ${stopName} स्टॉप को छोड़ सकती है।`,
  ghost: (routeName: string, ghostMin: number): string =>
    `रूट ${routeName} पर निर्धारित प्रस्थान का कोई लाइव ट्रैकिंग सिग्नल नहीं मिला है (प्रस्थान के ${ghostMin} मिनट बाद)।`,
};
