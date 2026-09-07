/** Primary sources checked 2026-09-07. Fictional applications are labelled separately. */
export const SOURCES = {
  goodNews: {
    book: "Capitalizing on Positive Events",
    author: "Greater Good Science Center, UC Berkeley",
    url: "https://ggia.berkeley.edu/practice/capitalizing_on_positive_events",
  },
  listening: {
    book: "Active Listening",
    author: "Greater Good Science Center, UC Berkeley",
    url: "https://ggia.berkeley.edu/practice/active_listening",
  },
  options: {
    book: "How to Use MESOs in Business Negotiations",
    author: "Program on Negotiation, Harvard Law School",
    url: "https://www.pon.harvard.edu/daily/business-negotiations/how-to-use-mesos-in-business-negotiations/",
  },
  criteria: {
    book: "How to Create Value at the Negotiation Table",
    author: "Program on Negotiation, Harvard Law School",
    url: "https://www.pon.harvard.edu/daily/negotiation-skills-daily/crafting-joint-gains-in-negotiation/",
  },
  apology: {
    book: "The art of a heartfelt apology",
    author: "Julie Corliss, Harvard Health Publishing",
    url: "https://www.health.harvard.edu/blog/the-art-of-a-heartfelt-apology-2021041322366",
  },
  pause: {
    book: "Love Smarter by Learning When to Take a Break",
    author: "The Gottman Institute",
    url: "https://www.gottman.com/blog/love-smarter-learning-take-break/",
  },
  identity: {
    book: "LGBTQ+ communication best practices",
    author: "Spectrum Center, University of Michigan",
    url: "https://spectrumcenter.umich.edu/education-resources/lgbtq-communication-best-practices",
  },
  access: {
    book: "Meet people’s accessibility needs",
    author: "Australian Government, Disability Gateway",
    url: "https://www.disabilitygateway.gov.au/ads/strategy/good-practice-guidelines/accessibility-needs",
  },
};
export const practiceSource = (key: keyof typeof SOURCES) =>
  `Original fictional practice inspired by ${SOURCES[key].book} — ${SOURCES[key].author}. ${SOURCES[key].url}`;
