/* ===== Stump League — data layer (prototype) =====
   Every real-world fact carries a source id. Ratings marked draft:true
   are prototype judgments awaiting reviewer sign-off and are excluded
   from scores unless the viewer opts in. */

const AS_OF = "Oct 23, 2026";

const SOURCES = {
  eoa_womack: { pub: "Encyclopedia of Arkansas", title: "Steve Womack (1957–)", date: "2025", url: "https://encyclopediaofarkansas.net/entries/steve-womack-8442" },
  adg_2016: { pub: "Arkansas Democrat-Gazette", title: "Womack sets record in Congress", date: "Feb 2, 2016", url: "https://www.arkansasonline.com/news/2016/feb/02/womack-sets-record-congress/" },
  tbp_cpf26: { pub: "Talk Business & Politics", title: "Cutting through the noise and funding what matters (Womack op-ed)", date: "Aug 2025", url: "https://talkbusiness.net/2025/08/cutting-through-the-noise-and-funding-what-matters/" },
  cr_cpf26_law: { pub: "Office of Rep. Womack via CapitolReleases", title: "All 15 community projects signed into law", date: "Feb 2026", url: "https://capitolreleases.com/releases/5f2e3c48-4560-4367-a781-f3dc29ede0cb" },
  cr_cpf27: { pub: "Office of Rep. Womack via CapitolReleases", title: "Stakeholders welcome FY2027 Community Project Funding", date: "Jun 18, 2026", url: "https://capitolreleases.com/releases/4a72df48-df73-4c2a-9434-78ccb64876cf" },
  cr_fy26_pkg: { pub: "Office of Rep. Womack via CapitolReleases", title: "Womack votes to pass amended full-year spending package", date: "Feb 3, 2026", url: "https://capitolreleases.com/releases/c754ff94-d0e4-420e-9ff7-156a5b1e2517" },
  cr_reopen: { pub: "Office of Rep. Womack via CapitolReleases", title: "Womack votes to reopen government", date: "Nov 12, 2025", url: "https://capitolreleases.com/releases/457a1b15-268b-4ce2-ac89-e69deffae0a5" },
  ardot_105: { pub: "Arkansas Department of Transportation", title: "ARDOT set to receive an additional $105.5 million", date: "Feb 6, 2026", url: "https://ardot.gov/?p=112570" },
  tbp_iija: { pub: "Talk Business & Politics", title: "Rep. Womack: Infrastructure funding will continue after IIJA expires", date: "Jul 2025", url: "https://talkbusiness.net/2025/07/rep-womack-infrastructure-funding-will-continue-after-iija-expires/" },
  pbs_ar3: { pub: "Arkansas TV / PBS", title: "Election 2026 debate: U.S. District 3", date: "Oct 15, 2026", url: "https://www.pbs.org/video/us-district-3-kuboc9/" },
  tbp_2024p: { pub: "Talk Business & Politics", title: "Rep. Womack earns nomination", date: "Mar 2024", url: "https://talkbusiness.net/?p=272051" },
  nbc_2024: { pub: "NBC News", title: "Arkansas House District 3 results 2024", date: "Nov 2024", url: "https://www.nbcnews.com/politics/2024-elections/arkansas-us-house-district-3-results" },
  ryerse_meet: { pub: "Robb Ryerse campaign", title: "Meet Robb", date: "2026", url: "https://www.robbforcongress.com/meet-robb" },
  ryerse_blog: { pub: "Robb Ryerse campaign", title: "Issues blog", date: "2025", url: "https://www.robbforcongress.com/blog" },
  sentinel_2018: { pub: "The Sentinel-Record", title: "Womack defeats Ryerse in 2018 primary", date: "May 23, 2018", url: "https://www.pressreader.com/usa/the-sentinel-record/20180523/281625305966044" },
  politics1_ar: { pub: "Politics1", title: "Arkansas candidate guide", date: "2026", url: "https://politics1.com/ar.htm" },
  ada_lp: { pub: "Arkansas Advocate", title: "Libertarian Party of Arkansas nominates 2026 candidates", date: "Feb 2026", url: "https://arkansasadvocate.com/?p=23449" },
  fec_wilson: { pub: "Federal Election Commission", title: "Candidate profile: Wilson, Bobby (H4AR03081)", date: "2026 cycle", url: "https://www.fec.gov/data/candidate/H4AR03081/?cycle=2026" },
  vivek_plan: { pub: "Ramaswamy campaign", title: "Plan to make Ohio more affordable", date: "2026", url: "https://vivekforohio.com/the-plan/what-is-vivek-ramaswamys-plan-to-make-ohio-more-affordable/" },
  vivek_faq: { pub: "Ramaswamy campaign", title: "FAQ", date: "2026", url: "https://vivekforohio.com/faq/" },
  wmoh_town: { pub: "WMOH", title: "Ramaswamy town hall on property and income taxes", date: "2026", url: "https://wmoh.com/the-ticket-updates/926362" },
  ocj_prop: { pub: "Ohio Capital Journal via States Newsroom", title: "Ramaswamy touts tax plans at Columbus Metropolitan Club", date: "2026", url: "https://www.newsfromthestates.com/node/432922" },
  san_launch: { pub: "Straight Arrow News", title: "Ramaswamy announces run for Ohio governor", date: "Feb 2025", url: "https://san.com/?p=335875" },
  fox_self: { pub: "Fox News", title: "Report on Acton debate refusal; Ramaswamy self-funding headline", date: "Sep 12, 2026", url: "https://www.foxnews.com/politics/dem-handlers-lash-out-when-ramaswamy-staffer-confronts-boss-about-debate-no-pictures" },
  signal_debate: { pub: "Signal Ohio", title: "Amy Acton refuses to debate Vivek Ramaswamy", date: "2026", url: "https://signalohio.org/amy-acton-refuses-to-debate-vivek-ramaswamy-in-ohio-governors-race/" },
  ddn_kissick: { pub: "Dayton Daily News", title: "Acton refuses to debate; Kissick asks Ramaswamy to debate", date: "2026", url: "https://www.daytondailynews.com/tncms/asset/editorial/73f43103-6745-59ac-8ef5-2748dddb20de" },
  tbp_2017: { pub: "Talk Business & Politics", title: "Pastor plans GOP primary challenge to Rep. Womack", date: "May 2017", url: "https://talkbusiness.net/2017/05/pastor-plans-gop-primary-challenge-to-rep-womack-running-on-brand-new-congress-platform/" },
  ocj_reader: { pub: "Ohio Capital Journal", title: "Catching Our Eye roundup (Kissick answers reader questions)", date: "Jul 14, 2026", url: "https://www.newsfromthestates.com/node/417160" },
  wysu_acton: { pub: "WYSU", title: "Acton releases affordability ideas, few specifics on funding", date: "Apr 6, 2026", url: "https://wysu.org/ohio-news/2026-04-06/ohio-governor-race-acton-releases-lots-of-affordability-ideas-but-few-specifics-on-funding-them" },
  cle19_acton: { pub: "Cleveland 19 News", title: "Acton outlines affordability plan", date: "Oct 20, 2026", url: "https://www.cleveland19.com/2026/10/20/acton-outlines-affordability-plan-defends-refusal-debate-ramaswamy/" },
  trib_acton: { pub: "Tribune Chronicle", title: "Acton vows to work with both Dems, GOP", date: "May 2026", url: "https://www.tribtoday.com/news/local-news/2026/05/acton-vows-to-work-with-both-dems-gop/" },
  wtvg_acton: { pub: "13abc / WTVG", title: "Acton rallies voters in Toledo, outlines platform", date: "Aug 5, 2026", url: "https://www.13abc.com/2026/08/05/acton-rallies-voters-toledo-outlines-platform-governors-race/" },
  stateside_acton: { pub: "Stateside", title: "Amy Acton governor profile", date: "Jul 2026", url: "https://www.stateside.com/sites/default/files/2026-07/Amy%20Acton%20Gov%20Profile.pdf" },
  axios_oh: { pub: "Axios Cleveland", title: "Acton and Ramaswamy battle for Ohio governor", date: "Oct 20, 2026", url: "https://www.axios.com/local/cleveland/2026/10/20/amy-acton-vivek-ramaswamy-ohio-governor-election-preview" },
  wgcu_oh: { pub: "NPR via WGCU", title: "Ramaswamy and Acton clash in rare Democratic pickup opportunity", date: "Sep 27, 2026", url: "https://www.wgcu.org/2026-09-27/ohio-governors-race-ramaswamy-and-acton-clash-in-rare-democratic-pickup-opportunity" },
  hometown_kissick: { pub: "Hometown Stations", title: "Libertarian candidates Kissick, Mills outline vision", date: "2026", url: "https://www.hometownstations.com/news/libertarian-candidates-kissick-mills-outline-vision-in-lima-ahead-of-ohio-governor-race/article_944be1ce-869a-40e5-9b68-fd9b244c0f42.html" },
  ocj_datacenter: { pub: "Ohio Capital Journal via States Newsroom", title: "Kissick calls for moratorium on new data centers", date: "Aug 2026", url: "https://www.newsfromthestates.com/node/420896" },
  ivoter_kissick: { pub: "iVoterGuide", title: "Don Kissick candidate profile", date: "2026", url: "https://ivoterguide.com/candidate/42978/race/2181/election/606" },
  ballotbrief_kissick: { pub: "The Ballot Brief", title: "Don Kissick profile", date: "2026", url: "https://theballotbrief.com/candidate/don-kissick-oh" },
  dispatch_gov: { pub: "Columbus Dispatch via AOL", title: "See who's running for statewide office in Ohio", date: "2026", url: "https://www.aol.com/articles/see-whos-running-statewide-office-224644436.html" },
  cel_faq: { pub: "Center for Effective Lawmaking", title: "FAQ: Legislative Effectiveness Scores", date: "2025", url: "https://thelawmakers.org/faq" },
  pf_promise: { pub: "PolitiFact", title: "How promise ratings work (Coop-O-Meter)", date: "Dec 2016", url: "https://politifact.com/article/2016/dec/05/coming-2017-announcing-cooper-o-meter/" },
  cel_api: { pub: "Center for Effective Lawmaking", title: "Legislative Effectiveness Scores, 118th Congress (scores table and Womack scorecard)", date: "retrieved Oct 23, 2026", url: "https://thelawmakers.org/find-representatives" },
  fec_womack: { pub: "Federal Election Commission", title: "Womack, Steve (H0AR03055) 2025–2026 financial summary", date: "through Oct 14, 2026", url: "https://www.fec.gov/data/candidate/H0AR03055/?cycle=2026" },
  fec_ryerse: { pub: "Federal Election Commission", title: "Ryerse, Robb (H6AR03128) 2025–2026 financial summary", date: "through Sep 30, 2026", url: "https://www.fec.gov/data/candidate/H6AR03128/" },
  pf_ramaswamy: { pub: "PolitiFact", title: "Vivek Ramaswamy: rulings scorecard", date: "retrieved Oct 23, 2026", url: "https://www.politifact.com/personalities/vivek-ramaswamy" },
  pf_acton: { pub: "PolitiFact", title: "Amy Acton: rulings scorecard", date: "retrieved Oct 23, 2026", url: "https://www.politifact.com/personalities/amy-acton/" },
  watchvote_womack: { pub: "watch.vote, from House Clerk roll-call records", title: "Steve Womack voting record, 119th Congress", date: "through Sep 16, 2026", url: "https://watch.vote/members/house/ar/steve-womack" },
  cr_firstmiss: { pub: "Office of Rep. Womack via CapitolReleases", title: "Womack to miss first-ever vote", date: "Nov 17, 2025", url: "https://capitolreleases.com/releases/0f72cd90-0801-469f-bd2e-788d7e3ab271" },
  tr_womack: { pub: "Times Record via Yahoo News", title: "Rep. Steve Womack mourns wife of 41 years after brief illness", date: "Jan 2026", url: "https://www.yahoo.com/news/articles/rep-womack-misses-votes-care-163933916.html" },
  zip_cd: { pub: "OpenSourceActivismTech / U.S. Census Bureau", title: "ZIP code tabulation areas to 119th Congress districts", date: "updated Jun 30, 2026", url: "https://github.com/OpenSourceActivismTech/us-zipcodes-congress" },
  us_legislators: { pub: "@unitedstates project", title: "congress-legislators: current members and IDs", date: "retrieved Oct 23, 2026", url: "https://github.com/unitedstates/congress-legislators" },
  clerk_votes: { pub: "Office of the Clerk, U.S. House", title: "Roll-call votes, 2025–2026 (676 roll calls)", date: "retrieved Oct 24, 2026", url: "https://clerk.house.gov/Votes" },
  cg_womack: { pub: "Congress.gov", title: "Rep. Steve Womack: sponsored legislation and cosponsors, 119th Congress", date: "retrieved Oct 24, 2026", url: "https://www.congress.gov/member/W000809" },
  claimreview: { pub: "Google Fact Check Tools (ClaimReview): PolitiFact, The Washington Post, FactCheck.org", title: "Fact-check rulings on Vivek Ramaswamy", date: "retrieved Oct 24, 2026", url: "https://toolbox.google.com/factcheck/explorer" },
  ballotpedia_counts: { pub: "NCSL", title: "2026 elections put statehouses in the spotlight", date: "Sep 14, 2026", url: "https://www.ncsl.org/resources/details/2026-Elections-Put-Statehouses-Ballot-Measures-in-the-Spotlight" }
};

/* ===== The five KPIs. Order is the order on every card. =====
   defaultOn: whether the KPI counts toward "Your ranking" before the voter changes anything.
   KPIs that encode values (funding, bipartisanship) start switched off. */
const STATS = [
  { key: "answers", label: "Answers to voters", short: "ANSWERS", who: "Everyone", defaultOn: true, flagship: true,
    q: "Will they face me?",
    explain: "Whether candidates face voters on equal terms: nonpartisan debates where every qualifying candidate was invited, nonpartisan voter-guide questionnaires sent to every candidate, public town halls announced in advance, and required financial disclosures filed on time. Only collected parts count; the card lists which parts are still missing." },
  { key: "funding", label: "Who funds them", short: "FUNDING", who: "Everyone with filings", defaultOn: false, valueLaden: true,
    q: "Who do they owe?",
    explain: "Where campaign money comes from: the share from donors giving $200 or less, the share from PACs and party committees, and the share of itemized individual money from the candidate's own state. For ranking, a higher score means more money from small donors, home-state donors and individuals rather than PACs. Switched off by default because voters disagree about whether this matters." },
  { key: "attendance", label: "Shows up", short: "SHOWS UP", who: "Officeholders", defaultOn: true,
    q: "Do they do the job?",
    explain: "Share of recorded roll-call votes the official cast, from official House Clerk and Senate records (via Voteview). Compared with every member of the same chamber. When an official has a documented family or medical absence, the stat is held as a draft until reviewers label those votes." },
  { key: "effectiveness", label: "Gets results", short: "RESULTS", who: "Legislators", defaultOn: true,
    q: "Can they get anything done?",
    explain: "How far an official's own bills advance, weighted by significance, compared with a benchmark for members in a similar position (party, seniority, committee roles). From the Center for Effective Lawmaking. Majority-party members advance more bills; the benchmark reduces that advantage but doesn't remove it." },
  { key: "bipartisan", label: "Works across lines", short: "ACROSS", who: "Legislators", defaultOn: false, valueLaden: true,
    q: "Will they work with the other side?",
    explain: "The Lugar Center and Georgetown McCourt School Bipartisan Index: how often a member's bills attract cosponsors from the other party, and how often they cosponsor the other party's bills, compared with a 20-year baseline. Switched off by default because voters split on whether compromise is a virtue." }
];

/* Peer-relative "category leader" wording. */
const LEADER_BANDS = [[0.9, "Top 10%"], [0.75, "Top 25%"], [0.25, "Middle 50%"], [0.1, "Bottom 25%"], [0, "Bottom 10%"]];

/* Pilot races outside Arkansas. Arkansas races are generated from the data pipeline (ar.js). */
const RACES = [
  {
    id: "ohgov", short: "OH-GOV", name: "Governor · Ohio", state: "Ohio", office: "governor", level: "pilot",
    election: "Nov 3, 2026", sample: false,
    blurb: "An open seat. None of the three nominees has held elected office, so their cards are mostly profiles and plans.",
    can: ["Sign or veto bills from the Ohio legislature", "Propose the state budget", "Appoint officials such as utility regulators and university trustees", "Sit on the Ohio Redistricting Commission"],
    cant: ["Set local property tax rates; those are set locally, and levies above 10 mills go to voters", "Pass a law without the legislature"],
    context: [
      { text: "Republicans currently control both chambers of the Ohio legislature.", src: "axios_oh" },
      { text: "No governor's debate is scheduled: Acton's campaign declined; Ramaswamy accepted a CNN invitation that didn't include the Libertarian nominee.", src: "signal_debate", src2: "fox_self" }
    ],
    canSrc: ["dispatch_gov", "ocj_prop"],
    candidates: ["ramaswamy", "acton", "kissick"]
  },
  {
    id: "demo", short: "DEMO-9", name: "Fictional State · 9th District", state: "Fictional State", office: "house", level: "pilot",
    election: "Sample", sample: true,
    blurb: "A fully invented race with every KPI filled in, so you can see how category leaders and Your ranking behave with complete data. Nothing here is real.",
    can: ["Write, sponsor and vote on bills", "Request earmarks", "Oversee agencies"],
    cant: ["Pass anything alone", "Set local taxes"],
    context: [{ text: "Everything in this race is invented. Parties are labeled A, B and Independent on purpose." }],
    candidates: ["d_whitfield", "d_oyelaran", "d_tran"]
  }
];

const NA = (note) => ({ status: "na", note });
const PENDING = (note) => ({ status: "pending", note });
const EXEC_NA = "Executive office. Legislative stats don't apply; an executive record (budgets, vetoes, appointments) isn't collected yet.";

const CANDS = {
  ramaswamy: {
    name: "Vivek Ramaswamy", party: "Republican", role: "Open-seat candidate", track: "candidate", initials: "VR",
    ids: { factcheck: "Vivek Ramaswamy" },
    facts: [
      { label: "Background", text: "Biotech entrepreneur and 2024 Republican presidential candidate. Has not held elected office.", src: "wgcu_oh" },
      { label: "Campaign money", text: "Reported putting $25M of his own money into the race and raising $50M (state filings not yet connected).", src: "fox_self" },
      { label: "Plan costs", text: "Reporters have questioned how he would pay for his property and income tax cuts.", src: "ocj_prop" }
    ],
    kpi: {
      answers: { status: "official", norm: 0, display: "Answered 0 of 1 tracked questionnaires",
        parts: [
          { label: "Qualifying debates", state: "na", value: "None offered to every qualifying candidate", src: "signal_debate" },
          { label: "Questionnaires", state: "no", value: "Didn't answer the Ohio Capital Journal's reader questions (July 2026)", src: "ocj_reader" },
          { label: "Town halls", state: "pending", value: "Not collected yet" },
          { label: "Disclosures", state: "pending", value: "Not collected yet" } ] },
      funding: PENDING("Ohio state campaign-finance filings not connected yet."),
      attendance: NA(EXEC_NA), effectiveness: NA("Applies to legislators"), bipartisan: NA("Applies to legislators")
    },
    plans: [
      { text: "Phase out Ohio's income tax over 10 years, starting with repeal of the capital gains tax.", src: "vivek_plan", checks: { m: 1, t: 1, c: 0, p: 1 } },
      { text: "Reset property taxes to pre-pandemic levels in the first six months of 2027, then cap growth.", src: "wmoh_town", checks: { m: 1, t: 1, c: 0, p: 0 },
        notes: [{ text: "Property tax rates are set locally, so reporters say the state mechanism is unclear.", src: "ocj_prop" }] },
      { text: "Introduce merit-based pay for teachers and administrators.", src: "san_launch", checks: { m: 1, t: 0, c: 0, p: 1 } },
      { text: "Restart work requirements for Medicaid and welfare.", src: "san_launch", checks: { m: 1, t: 0, c: 0, p: 1 } }
    ],
    positions: {
      taxes: { text: "Phase out income tax over 10 years; roll property taxes back to pre-pandemic levels and cap them.", src: "vivek_plan" },
      health: { text: "Medicaid work requirements; use anti-fraud savings to lower premiums.", src: "vivek_faq" },
      schools: { text: "Merit pay for teachers; add a stronger statewide piece to school funding.", src: "wmoh_town" },
      energy: { text: "Expand natural gas production to lower energy bills.", src: "vivek_plan" }
    }
  },
  acton: {
    name: "Amy Acton", party: "Democratic", role: "Open-seat candidate", track: "candidate", initials: "AA",
    ids: { factcheck: "Amy Acton" },
    facts: [
      { label: "Background", text: "Physician; former director of the Ohio Department of Health who led the state's early COVID-19 response; later worked at The Columbus Foundation. Has not held elected office.", src: "stateside_acton" },
      { label: "Plan costs", text: "Released an affordability plan with few specifics on how it would be paid for.", src: "wysu_acton" }
    ],
    kpi: {
      answers: { status: "official", norm: 0, display: "Answered 0 of 1 tracked questionnaires",
        parts: [
          { label: "Qualifying debates", state: "na", value: "None offered to every qualifying candidate; her campaign declined a debate with Ramaswamy", src: "signal_debate" },
          { label: "Questionnaires", state: "no", value: "Didn't answer the Ohio Capital Journal's reader questions (July 2026)", src: "ocj_reader" },
          { label: "Town halls", state: "pending", value: "Not collected yet" },
          { label: "Disclosures", state: "pending", value: "Not collected yet" } ] },
      funding: PENDING("Ohio state campaign-finance filings not connected yet."),
      attendance: NA(EXEC_NA), effectiveness: NA("Applies to legislators"), bipartisan: NA("Applies to legislators")
    },
    plans: [
      { text: "Pass a tax cut for working families as a top priority.", src: "trib_acton", checks: { m: 0, t: 0, c: 0, p: 1 } },
      { text: "Launch Ohio Rx, an online platform to lower prescription drug costs.", src: "wysu_acton", checks: { m: 1, t: 0, c: 0, p: 1 } },
      { text: "Honor the bipartisan school funding plan and fully fund public schools.", src: "cle19_acton", checks: { m: 1, t: 0, c: 0, p: 1 } },
      { text: "Issue executive orders and a 100-day relief plan starting day one.", src: "cle19_acton", checks: { m: 0, t: 1, c: 0, p: 1 } }
    ],
    positions: {
      taxes: { text: "Tax cut for lower- and middle-income Ohioans; property tax reductions.", src: "wtvg_acton" },
      health: { text: "Ohio Rx drug platform; insurance and hospital price transparency; crack down on surprise billing.", src: "wysu_acton" },
      schools: { text: "Fully fund public schools under the bipartisan funding plan.", src: "cle19_acton" },
      energy: { text: "Lower utility costs.", src: "wtvg_acton" }
    }
  },
  kissick: {
    name: "Don Kissick", party: "Libertarian", role: "Open-seat candidate", track: "candidate", initials: "DK",
    ids: { factcheck: "Don Kissick" },
    facts: [
      { label: "Background", text: "U.S. Navy veteran and TV station control-room operator from Ottawa, Ohio. Has run for office several times, including U.S. Senate in 2024.", src: "ivoter_kissick", src2: "ocj_reader" },
      { label: "Debates", text: "Has publicly asked Ramaswamy to debate.", src: "ddn_kissick" }
    ],
    kpi: {
      answers: { status: "official", norm: 1, display: "Answered 1 of 1 tracked questionnaires",
        parts: [
          { label: "Qualifying debates", state: "na", value: "None offered to every qualifying candidate", src: "ddn_kissick" },
          { label: "Questionnaires", state: "yes", value: "Answered the Ohio Capital Journal's reader questions on 12 topics (July 2026)", src: "ocj_reader" },
          { label: "Town halls", state: "pending", value: "Not collected yet" },
          { label: "Disclosures", state: "pending", value: "Not collected yet" } ] },
      funding: PENDING("Ohio state campaign-finance filings not connected yet."),
      attendance: NA(EXEC_NA), effectiveness: NA("Applies to legislators"), bipartisan: NA("Applies to legislators")
    },
    plans: [
      { text: "Repeal Ohio's certificate-of-need laws for health care facilities.", src: "hometown_kissick", checks: { m: 1, t: 0, c: 0, p: 1 } },
      { text: "Impose an immediate moratorium on new data center projects.", src: "ocj_datacenter", checks: { m: 1, t: 1, c: 0, p: 0 },
        notes: [{ text: "A governor's authority to impose this alone is unclear." }] },
      { text: "Lower income taxes and end property taxes.", src: "ballotbrief_kissick", checks: { m: 0, t: 0, c: 0, p: 1 } }
    ],
    positions: {
      taxes: { text: "Lower income taxes; end property taxes.", src: "ballotbrief_kissick" },
      health: { text: "Repeal certificate-of-need laws.", src: "hometown_kissick" },
      schools: null,
      energy: { text: "Moratorium on new data centers.", src: "ocj_datacenter" }
    }
  },

  /* ---------- fictional sample race: every value is invented ---------- */
  d_whitfield: {
    name: "Dana Whitfield", party: "Party A", role: "Incumbent · 3 terms", track: "officeholder", initials: "DW", sample: true,
    facts: [{ label: "Prior office", text: "County treasurer for 8 years before Congress." }],
    kpi: {
      answers: { status: "sample", norm: 0.83, display: "Accepted 2 of 2 debates · answered 3 of 4 questionnaires" },
      funding: { status: "sample", norm: 0.44, display: "38% from PACs · 12% small donors · 61% in-state" },
      attendance: { status: "sample", norm: 0.72, pct: 0.72, peer: "House members (sample)", display: "98.6% of votes cast" },
      effectiveness: { status: "sample", norm: 0.81, pct: 0.81, peer: "House members (sample)", display: "1.44 LES · benchmark 1.10" },
      bipartisan: { status: "sample", norm: 0.40, pct: 0.40, peer: "House members (sample)", display: "Bipartisan Index −0.12" }
    },
    plans: [{ text: "Secure funding to replace the Route 40 river bridge by 2026.", checks: { m: 1, t: 1, c: 1, p: 1 } }],
    positions: { roads: { text: "Bridge and highway funding." }, money: { text: "Supports disclosure rules." }, cost: { text: "Child care tax credit." } }
  },
  d_oyelaran: {
    name: "Marcus Oyelaran", party: "Party B", role: "Challenger · ex-county commissioner", track: "candidate", initials: "MO", sample: true,
    facts: [{ label: "Prior office", text: "Two terms on the county commission; led a jail-budget audit." }],
    kpi: {
      answers: { status: "sample", norm: 1, display: "Accepted 2 of 2 debates · answered 5 of 5 questionnaires" },
      funding: { status: "sample", norm: 0.71, display: "4% from PACs · 48% small donors · 80% in-state" },
      attendance: NA("Applies to officeholders"), effectiveness: NA("Applies to legislators"), bipartisan: NA("Applies to legislators")
    },
    plans: [{ text: "Publish a costed plan for a regional transit line within 90 days of taking office.", checks: { m: 1, t: 1, c: 1, p: 1 } }],
    positions: { roads: { text: "Regional transit line." }, money: { text: "Ban on stock trading by members." }, cost: { text: "Housing supply grants." } }
  },
  d_tran: {
    name: "Jo Tran", party: "Independent", role: "First-time candidate", track: "candidate", initials: "JT", sample: true,
    facts: [{ label: "Background", text: "Small-business owner; no prior office." }],
    kpi: {
      answers: { status: "sample", norm: 0.5, display: "Accepted 1 of 2 debates · answered 3 of 5 questionnaires" },
      funding: { status: "sample", norm: 0.35, display: "Mostly self-funded" },
      attendance: NA("Applies to officeholders"), effectiveness: NA("Applies to legislators"), bipartisan: NA("Applies to legislators")
    },
    plans: [{ text: "Bring back common sense to Washington.", checks: { m: 0, t: 0, c: 0, p: 0 } }],
    positions: { roads: null, money: { text: "Term limits." }, cost: { text: "Lower prices." } }
  }
};

const POSITION_TOPICS = {
  house: [{ key: "roads", label: "Roads and infrastructure" }, { key: "money", label: "Money in politics" }, { key: "cost", label: "Cost of living" }],
  governor: [{ key: "taxes", label: "Taxes" }, { key: "health", label: "Health care" }, { key: "schools", label: "Schools" }, { key: "energy", label: "Energy and data centers" }]
};

/* Data feeds. "Nightly" = refreshed by the nightly job, not real-time. */
const FEEDS = [
  { key: "cel", name: "Legislative Effectiveness Scores", org: "Center for Effective Lawmaking", stat: "Gets results (Congress)", how: "CEL scores API", note: "118th Congress (2023–24); 119th scores publish after the term ends." },
  { key: "cel_state", name: "State legislative effectiveness", org: "Center for Effective Lawmaking", stat: "Gets results (Arkansas legislature)", how: "CEL state scores API", note: "Arkansas House and Senate, 2023–24 term." },
  { key: "votes", name: "House roll-call votes", org: "Office of the Clerk, U.S. House", stat: "Shows up (House)", how: "Clerk roll-call XML", note: "Each night adds only new votes." },
  { key: "senate_votes", name: "Senate roll-call votes", org: "Voteview (UCLA), from U.S. Senate records", stat: "Shows up (Senate)", how: "Voteview vote files", note: "senate.gov refuses automated downloads." },
  { key: "lugar", name: "Bipartisan Index", org: "The Lugar Center and Georgetown McCourt School", stat: "Works across lines", how: "Published scores, imported by hand", note: "2023 (118th Congress, first session). Updated when a new release is published.", manual: true },
  { key: "fec", name: "Campaign finance", org: "Federal Election Commission", stat: "Who funds them (federal races)", how: "OpenFEC API", note: "Every Arkansas federal candidate the FEC lists. State races report to state offices (not yet connected)." },
  { key: "factchecks", name: "Fact-check rulings", org: "PolitiFact, The Washington Post, FactCheck.org and others", stat: "Dated list on each card (not scored)", how: "Google Fact Check Tools (ClaimReview)", note: "Shown as a list, never as a rate." },
  { key: "zips", name: "ZIP to district", org: "U.S. Census Bureau via OpenSourceActivismTech", stat: "Ballot lookup", how: "ZCTA relationship files, 119th Congress map", note: "About 15% of ZIPs span two districts; the page asks you to confirm." },
  { key: "members", name: "Member IDs", org: "@unitedstates congress-legislators", stat: "Links every dataset", how: "Public YAML dataset", note: "Bioguide, FEC and other IDs for all current members." },
  { key: "_q", name: "Candidate questionnaires, town halls, disclosures", org: "Vote411 (League of Women Voters), Ballotpedia, newsrooms", stat: "Answers to voters", how: "Not connected yet", note: "Only debates (and one Ohio questionnaire) are collected so far.", next: true },
  { key: "_plans", name: "Plans", org: "Campaign sites, speeches, ads", stat: "Plans (not scored)", how: "AI-drafted, unreviewed", note: "Every plan checklist is a draft until reviewed.", manualDraft: true }
];

/* ===== Fantasy demo league: fictional players only ===== */
const PLAYERS = [
  { id: "p1", name: "Gov. Rhea Calder", pos: "QB", party: "A", team: "Midwest", status: "Active", events: [["Bill became law: on-time budget", 12], ["Budget enacted on time", 5], ["Public town hall (announced)", 2], ["Financial disclosure filed on time", 2], ["Answered a nonpartisan questionnaire", 2], ["Bill became law: broadband grants", 12], ["Answered a nonpartisan questionnaire", 2], ["Declined a qualifying debate", -3]] },
  { id: "p2", name: "Gov. Tomas Ilves", pos: "QB", party: "B", team: "West", status: "Limited", events: [["Bill passed committee: transit", 3], ["Financial disclosure filed on time", 2], ["Public town hall (announced)", 2], ["Answered a nonpartisan questionnaire", 2], ["Accepted a qualifying debate", 3], ["Declined a qualifying debate", -3], ["Financial disclosure filed on time", 2], ["Declined a qualifying debate", -3]] },
  { id: "p3", name: "Sen. Ada Marchetti", pos: "WR", party: "B", team: "Northeast", status: "Active", events: [["Bill passed chamber", 6], ["Cross-party cosponsors", 2], ["12 votes cast", 2.4], ["Bill became law: veterans clinic", 12], ["Public town hall (announced)", 2], ["Answered a nonpartisan questionnaire", 2]] },
  { id: "p4", name: "Sen. Cole Harlan", pos: "WR", party: "A", team: "South", status: "Active", events: [["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["11 votes cast", 2.2], ["Unexcused vote missed", -1], ["Bill passed committee: farm bill", 3], ["Answered a nonpartisan questionnaire", 2], ["Bill passed committee", 3], ["Accepted a qualifying debate", 3]] },
  { id: "p5", name: "Sen. Imani Okafor", pos: "WR", party: "A", team: "Midwest", status: "Active", events: [["Bill became law", 12], ["12 votes cast", 2.4], ["Unexcused vote missed", -1], ["Public town hall (announced)", 2]] },
  { id: "p6", name: "Sen. Pete Lindqvist", pos: "WR", party: "I", team: "West", status: "Inactive", events: [["Unexcused vote missed", -1], ["Unexcused vote missed", -1]] },
  { id: "p7", name: "Rep. Lena Ruiz", pos: "RB", party: "B", team: "West", status: "Active", events: [["Bill passed chamber", 6], ["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["12 votes cast", 2.4], ["Bill became law: port dredging", 12], ["Unexcused vote missed", -1], ["Declined a qualifying debate", -3], ["Public town hall (announced)", 2]] },
  { id: "p8", name: "Rep. Gus Brandt", pos: "RB", party: "A", team: "Midwest", status: "Active", events: [["Bill passed committee", 3], ["12 votes cast", 2.4], ["Bill became law: bridge funding", 12], ["Answered a nonpartisan questionnaire", 2]] },
  { id: "p9", name: "Rep. Nia Holloway", pos: "RB", party: "A", team: "South", status: "Active", events: [["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["12 votes cast", 2.4], ["Bill passed committee: flood maps", 3], ["Public town hall (announced)", 2], ["Accepted a qualifying debate", 3], ["Declined a qualifying debate", -3], ["Answered a nonpartisan questionnaire", 2]] },
  { id: "p10", name: "Rep. Owen Paik", pos: "RB", party: "B", team: "Northeast", status: "Active", events: [["Bill passed committee", 3], ["12 votes cast", 2.4], ["Cross-party cosponsors", 2], ["Public town hall (announced)", 2], ["Answered a nonpartisan questionnaire", 2], ["Unexcused vote missed", -1], ["Answered a nonpartisan questionnaire", 2]] },
  { id: "p11", name: "Rep. Sal Ferrante", pos: "RB", party: "I", team: "Northeast", status: "Limited", events: [["10 votes cast", 2], ["Unexcused vote missed", -1], ["Unexcused vote missed", -1], ["Public town hall (announced)", 2], ["Cross-party cosponsors", 2], ["Accepted a qualifying debate", 3], ["Declined a qualifying debate", -3], ["Answered a nonpartisan questionnaire", 2]] },
  { id: "p12", name: "Rep. June Abara", pos: "RB", party: "B", team: "South", status: "Active", events: [["Bill passed committee", 3], ["12 votes cast", 2.4], ["Public town hall (announced)", 2], ["Answered a nonpartisan questionnaire", 2], ["Answered a nonpartisan questionnaire", 2], ["Unexcused vote missed", -1], ["Declined a qualifying debate", -3]] },
  { id: "p13", name: "Gov. Bea Lindell", pos: "QB", party: "I", team: "Northeast", status: "Active", events: [["Bill became law: tuition freeze", 12], ["Financial disclosure filed on time", 2], ["Budget enacted on time", 5], ["Missed 8 unexcused votes", -8], ["Public town hall (announced)", 2], ["Accepted a qualifying debate", 3], ["Answered a nonpartisan questionnaire", 2], ["Answered a nonpartisan questionnaire", 2]] },
  { id: "p14", name: "Sen. Hal Mercer", pos: "WR", party: "B", team: "South", status: "Active", events: [["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["11 votes cast", 2.2], ["Bill passed committee: VA backlog", 3], ["Public town hall (announced)", 2]] }
];
const OPPONENT = { name: "The Filibusters", roster: ["p2", "p4", "p6", "p9", "p10", "p11"] };
const DEFAULT_ROSTER = { QB: "p1", WR1: "p3", WR2: "p5", RB1: "p7", RB2: "p8", FLEX: "p12" };
const SLOTS = [["QB", "QB"], ["WR1", "WR"], ["WR2", "WR"], ["RB1", "RB"], ["RB2", "RB"], ["FLEX", "FLEX"]];

const SCORING = [
  ["Qualifying debate accepted / declined", "+3 / −3"], ["Nonpartisan questionnaire answered", "+2"], ["Public town hall (announced, open to all)", "+2"],
  ["Financial disclosure filed on time", "+2"], ["Vote cast", "+0.2"], ["Unexcused vote missed", "−1"],
  ["Sponsored bill passes committee / chamber / becomes law", "+3 / +6 / +12"], ["Bill with cross-party cosponsors", "+2"],
  ["Governor: budget enacted on time", "+5"], ["Fundraising totals, positions, how anyone voted on an issue", "Never scored"]
];

const DAILY = [
  { q: "Who sets most local property tax rates in Ohio?", opts: ["The governor", "The Ohio Senate", "Local governments and voters", "The federal government"], a: 2,
    why: "Rates are set locally, and levies above 10 mills go to voters. That's why each plan's checklist asks whether it's within the office's power." },
  { q: "What does a Legislative Effectiveness Score of 1.0 mean?", opts: ["Perfect score", "Exactly average for that chamber", "Passed one bill", "Lowest possible"], a: 1,
    why: "The Center for Effective Lawmaking scales scores so the average member of each chamber is 1.0." },
  { q: "An earmark is officially called what in the House?", opts: ["A rider", "Community Project Funding", "A block grant", "A continuing resolution"], a: 1,
    why: "Members request Community Project Funding for specific local projects inside spending bills." },
  { q: "Why doesn't Stump League give candidates one overall grade?", opts: ["It's too much work", "Voters disagree about what matters, so any single grade builds in someone's values", "Candidates asked us not to", "Grades are illegal"], a: 1,
    why: "In sports everyone agrees the goal is winning. In politics there's no shared goal, so you choose which stats count in Your ranking." },
  { q: "How many votes does a bill need to pass the U.S. House?", opts: ["60", "A majority of the members voting", "Two-thirds of all members", "Exactly 218, no matter how many vote"], a: 1,
    why: "A simple majority of members present and voting. That's 218 only when all 435 members vote." },
  { q: "Which of these does Stump League never score?", opts: ["Attendance", "Debates accepted", "How someone voted on an issue", "Bills advanced"], a: 2,
    why: "We measure whether officials do the job and face voters. Whether you agree with a vote is your call." },
  { q: "Why is \"Answers to voters\" the lead stat?", opts: ["It's the easiest to collect", "It's the one stat that compares challengers and incumbents fairly", "Incumbents always win it", "It measures popularity"], a: 1,
    why: "Challengers have no voting record, but every candidate can accept a debate or answer a questionnaire. Response rates to one national questionnaire fell from 72% in 1996 to 24% in 2020." }
];

const LESSONS = [
  { t: "How to read a scouting report", m: "2 min", body: [
    "Each scouting report has five stats. Every number shows its source, and stats from public records are labeled \"Official record.\" Draft items were written with AI help and haven't been reviewed. Grey means not collected yet.",
    "Category labels like \"Top 25%\" compare an official with everyone in the same chamber, inside one stat. There is no overall grade." ] },
  { t: "Building Your ranking", m: "2 min", body: [
    "Switch on the stats you care about and set how much each one counts. The ranking uses only stats every candidate in the race has, so challengers aren't punished for not having a voting record.",
    "Funding and bipartisanship start switched off because voters disagree about whether they matter. Turn them on if they matter to you." ] },
  { t: "What is an earmark?", m: "2 min", body: [
    "House members can request money for specific local projects inside spending bills. The House calls these Community Project Funding.",
    "Totals depend heavily on seniority and committee seats, and some members refuse earmarks on principle. That's why earmark dollars are shown as context and never scored." ] },
  { t: "What a governor can and can't do", m: "2 min", body: [
    "A governor signs or vetoes bills, proposes the budget and appoints the leaders of state agencies.",
    "A governor can't pass a law without the legislature, and local property tax rates are set locally. Each plan's checklist asks whether it's within the office's power." ] },
  { t: "How a bill becomes law", m: "3 min", body: [
    "A member introduces a bill. A committee may hold hearings and vote. If it passes committee, leaders decide whether it reaches the floor.",
    "It must pass both chambers in identical form, by a majority of the members voting, then the president or governor signs or vetoes it. Most bills never leave committee." ] },
  { t: "Why we never score positions", m: "1 min", body: [
    "Two people can look at the same vote and see opposite things. So we measure whether officials face voters, show up and get things done.",
    "Plans and positions appear in each candidate's own words, side by side and unscored." ] }
];
