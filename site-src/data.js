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

/* Stat categories. Order matters: it is the order on every card. */
const STATS = [
  { key: "promises", label: "Promise follow-through", short: "PROMISE", who: "Officeholders",
    explain: "Share of an officeholder's specific, sourced promises rated Kept or Compromise, weighted by how specific each promise was. Outcome and effort are tracked separately." },
  { key: "effectiveness", label: "Lawmaking effectiveness", short: "LES", who: "Legislators",
    explain: "Imported from the Center for Effective Lawmaking: Legislative Effectiveness Scores (LES) for Congress and State Legislative Effectiveness Scores (SLES) for state legislators. Scores average 1.0 across each chamber, and each lawmaker is compared with a benchmark for members in a similar position." },
  { key: "attendance", label: "Attendance", short: "ATTEND", who: "Officeholders",
    explain: "Share of recorded floor votes the official cast. Excused absences (illness, family) are labeled but not hidden." },
  { key: "bipartisan", label: "Bipartisanship", short: "BIPART", who: "Legislators",
    explain: "Share of sponsored bills that drew at least one cosponsor from another party." },
  { key: "access", label: "Debates and town halls", short: "ACCESS", who: "All candidates",
    explain: "Debates count only when a recognized nonpartisan host formally invited every qualifying candidate. Otherwise the debate history is shown as a fact and left out of the score." },
  { key: "transparency", label: "Transparency", short: "OPEN", who: "All candidates",
    explain: "Financial disclosures filed and nonpartisan voter-guide questionnaires answered, out of those offered." },
  { key: "factcheck", label: "Fact-check record", short: "FACTS", who: "All candidates",
    explain: "Share of independently fact-checked claims rated accurate or mostly accurate, across several fact-checkers. Hidden until at least 5 claims are rated." },
  { key: "specificity", label: "Promise specificity", short: "SPECIFIC", who: "All candidates",
    explain: "Average of a 0–4 checklist per promise: measurable, time-bound, costed, and within the office's power to do or formally propose." }
];

/* status: verified | draft | pending | na | fact (shown, never scored) */
const RACES = [
  {
    id: "ar3", short: "AR-3", name: "U.S. House · Arkansas 3rd District", state: "Arkansas", office: "house", level: "congress",
    election: "Nov 3, 2026", sample: false,
    blurb: "Northwest Arkansas and the Fort Smith area. A 15-year incumbent faces two challengers who have run before.",
    can: ["Write, sponsor and vote on federal bills", "Request Community Project Funding (earmarks) through appropriations", "Oversee federal agencies through committee work"],
    cant: ["Pass anything alone; 218 House votes and the Senate are needed", "Set state or local taxes", "Control how a state agency spends its own money"],
    context: [{ text: "Arkansas TV hosted a debate with all three nominees in October 2026.", src: "pbs_ar3", src2: "artv_debates" }],
    candidates: ["womack", "ryerse", "wilson"]
  },
  {
    id: "ohgov", short: "OH-GOV", name: "Governor · Ohio", state: "Ohio", office: "governor", level: "pilot",
    election: "Nov 3, 2026", sample: false,
    blurb: "An open seat. None of the three nominees has held elected office, so every card here is a scouting report.",
    can: ["Sign or veto bills from the Ohio legislature", "Propose the state budget", "Appoint officials such as utility regulators and university trustees", "Sit on the Ohio Redistricting Commission"],
    cant: ["Set local property tax rates; those are set locally, and levies above 10 mills go to voters", "Pass a law without the legislature"],
    context: [
      { text: "The winner would likely work with a Republican-controlled Statehouse.", src: "axios_oh" },
      { text: "No governor's debate is expected this year: Acton's campaign declined; Ramaswamy accepted a CNN invitation.", src: "signal_debate", src2: "fox_self" }
    ],
    canSrc: ["dispatch_gov", "ocj_prop"],
    candidates: ["ramaswamy", "acton", "kissick"]
  },
  {
    id: "demo", short: "DEMO-9", name: "Fictional State · 9th District", state: "Fictional State", office: "house", level: "pilot",
    election: "Sample", sample: true,
    blurb: "A fully fictional race with complete sample stats, so you can see how rankings, sliders and tiers behave when the data is filled in.",
    can: ["Write, sponsor and vote on bills", "Request earmarks", "Oversee agencies"],
    cant: ["Pass anything alone", "Set local taxes"],
    context: [{ text: "Everything in this race is invented for demonstration. Parties are labeled A, B and Independent on purpose." }],
    candidates: ["d_whitfield", "d_oyelaran", "d_tran"]
  }
];

const CANDS = {
  womack: {
    name: "Steve Womack", party: "Republican", role: "Incumbent since 2011", track: "veteran", initials: "SW",
    ids: { bioguide: "W000809", fec: "H0AR03055", factcheck: "Steve Womack" },
    facts: [
      { label: "Prior office", text: "Mayor of Rogers for 12 years; retired Arkansas Army National Guard colonel after 30+ years.", src: "tbp_2017", src2: "tbp_2024p" },
      { label: "Committee role", text: "Chairs the House Appropriations subcommittee on Transportation, Housing and Urban Development (THUD).", src: "cr_cpf27" },
      { label: "Last result", text: "Won the 2024 general election with 63.8%.", src: "nbc_2024" },
      { label: "Vote streak", text: "Cast 8,823 straight votes, a House record among sitting members, until Nov 2025, when he went home to care for his wife. She died in January 2026.", src: "eoa_womack", src2: "tr_womack" }
    ],
    stats: {
      promises: { status: "draft", from: "promises" },
      effectiveness: { status: "verified", norm: 0.347, display: "1.03 LES · meets expectations", sub: "Benchmark for members like him: 1.48 · 134th of 228 House Republicans · 118th Congress (2023–24)", src: "cel_api",
        note: "Counts bills he sponsored: 7 substantive and 1 substantive-and-significant, which became law. Projects he secures inside other bills don't count here." },
      attendance: { status: "draft", norm: 0.467, display: "72 of 675 roll calls missed (10.7%)", sub: "119th Congress, since Jan 3, 2025 · Before that: 8,823 straight votes", src: "clerk_votes", src2: "cr_firstmiss",
        note: "Includes the weeks he was home caring for his wife. Held as draft until reviewers label absences with a stated family or medical reason from the Congressional Record." },
      bipartisan: { status: "verified", norm: 0.6, display: "60% of bills", sub: "6 of 10 bills and joint resolutions drew a cosponsor from another party · 119th Congress", src: "cg_womack" },
      access: { status: "verified", norm: 1, display: "Debated", sub: "Arkansas TV, October 2026", src: "pbs_ar3" },
      transparency: { status: "pending", note: "Questionnaire tracking not yet complete." },
      factcheck: { status: "pending", note: "Fewer than 5 rated claims found." },
      specificity: { status: "draft", from: "promises" }
    },
    funds: {
      items: [
        { label: "FY2026 earmarks", value: "$108M+", sub: "15 projects · all signed into law", src: "tbp_cpf26", src2: "cr_cpf26_law" },
        { label: "FY2027 earmarks", value: "$105.4M", sub: "19 projects · advanced in committee", src: "cr_cpf27" },
        { label: "Largest single item", value: "$59M", sub: "Springdale Northern Bypass", src: "ardot_105" }
      ],
      context: [
        { text: "Earmark totals rise with seniority and committee position; he chairs the subcommittee that writes the transportation bill.", src: "cr_cpf27" },
        { text: "He voted against the 2021 infrastructure law (IIJA), which separately sent $282.5M to Northwest Arkansas National Airport access.", src: "tbp_iija" }
      ],
      peer: "Peer comparison (same-committee members, per capita, predecessor) not yet imported."
    },
    money: { asOf: "Oct 14, 2026", src: "fec_womack", items: [
      { label: "Raised this cycle", value: "$2.36M" },
      { label: "From PACs and party committees", value: "45%", sub: "$1.07M" },
      { label: "From donors giving $200 or less", value: "1.6%", sub: "$37.8K" } ],
      note: "Large individual donors gave the remaining 47% ($1.10M). Incumbents typically draw more PAC money than challengers." },
    promises: [
      { text: "Make Northwest Arkansas and River Valley roads a top priority in Congress.", src: "ardot_105",
        outcome: "Kept", effort: true, spec: { m: 0, t: 0, c: 0, p: 1 },
        evidence: [{ text: "$59M for the Springdale Northern Bypass, requested by Womack, enacted in FY2026.", src: "ardot_105" }] },
      { text: "Congress should deliver full-year government funding.", src: "cr_fy26_pkg",
        outcome: "Compromise", effort: true, spec: { m: 1, t: 0, c: 0, p: 1 },
        evidence: [{ text: "FY2026 full-year funding passed in Feb 2026, after a shutdown and stopgap measures.", src: "cr_reopen" }] }
    ],
    positions: {
      roads: { text: "Calls regional roads a top priority; secured bypass funding.", src: "ardot_105" },
      money: null, cost: null
    }
  },
  ryerse: {
    name: "Robb Ryerse", party: "Democratic", role: "Challenger", track: "rookie", initials: "RR",
    ids: { fec: "H6AR03128", factcheck: "Robb Ryerse" },
    facts: [
      { label: "Background", text: "Pastor and nonprofit leader; has lived in Springdale for 20 years and started the Vintage Fellowship church.", src: "ryerse_meet" },
      { label: "Prior campaign", text: "Challenged Womack in the 2018 Republican primary and lost.", src: "sentinel_2018" },
      { label: "Party", text: "Now running as a Democrat after leaving the Republican Party.", src: "politics1_ar" }
    ],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "verified", norm: 1, display: "Debated", sub: "Arkansas TV, October 2026", src: "pbs_ar3" },
      transparency: { status: "pending", note: "Questionnaire tracking not yet complete." },
      factcheck: { status: "pending", note: "Fewer than 5 rated claims found." },
      specificity: { status: "draft", from: "promises" }
    },
    promises: [
      { text: "Refuse corporate PAC money, as he did in 2018.", src: "ryerse_blog", outcome: "Checkable now", effort: null, spec: { m: 1, t: 1, c: 0, p: 1 },
        evidence: [{ text: "FEC shows about $7.6K from PACs and party committees combined through Oct 14, 2026 (4.7% of receipts). Whether any came from a corporate PAC needs the itemized donor list.", src: "fec_ryerse" }] },
      { text: "Lower the cost of living.", src: "ryerse_blog", outcome: "Not rated", effort: null, spec: { m: 0, t: 0, c: 0, p: 1 }, evidence: [] },
      { text: "Get big money out of politics.", src: "ryerse_blog", outcome: "Not rated", effort: null, spec: { m: 0, t: 0, c: 0, p: 1 }, evidence: [] }
    ],
    money: { asOf: "Oct 14, 2026", src: "fec_ryerse", items: [
      { label: "Raised this cycle", value: "$161K" },
      { label: "From PACs and party committees", value: "4.7%", sub: "$7.6K" },
      { label: "From donors giving $200 or less", value: "42%", sub: "$68.0K" } ],
      note: "Larger individual donors gave 53% ($84.9K)." },
    positions: {
      roads: null,
      money: { text: "Pledges no corporate PAC money.", src: "ryerse_blog" },
      cost: { text: "Lists lowering the cost of living as a campaign issue.", src: "ryerse_blog" }
    }
  },
  wilson: {
    name: "Bobby Wilson", party: "Libertarian", role: "Challenger", track: "rookie", initials: "BW",
    ids: { fec: "H4AR03081", factcheck: "Bobby Wilson" },
    facts: [
      { label: "Background", text: "Business analyst from Bentonville.", src: "politics1_ar" },
      { label: "Prior campaign", text: "Libertarian nominee for this seat in 2024 and again in 2026.", src: "ada_lp" },
      { label: "Campaign finance", text: "The FEC shows no financial summary for the 2025–2026 cycle.", src: "fec_wilson" }
    ],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "verified", norm: 1, display: "Debated", sub: "Arkansas TV, October 2026", src: "pbs_ar3" },
      transparency: { status: "pending", note: "Questionnaire tracking not yet complete." },
      factcheck: { status: "pending", note: "Fewer than 5 rated claims found." },
      specificity: { status: "pending", note: "No sourced 2026 promises collected yet." }
    },
    promises: [],
    positions: { roads: null, money: null, cost: null }
  },
  ramaswamy: {
    name: "Vivek Ramaswamy", party: "Republican", role: "Open-seat candidate", track: "rookie", initials: "VR",
    ids: { factcheck: "Vivek Ramaswamy" },
    facts: [
      { label: "Background", text: "Biotech entrepreneur and 2024 Republican presidential candidate. Has not held elected office.", src: "wgcu_oh" },
      { label: "Campaign finance", text: "Reported putting $25M of his own money into the race and raising $50M.", src: "fox_self" },
      { label: "Debates", text: "Accepted a CNN debate invitation; no debate is scheduled because his opponent declined.", src: "fox_self" },
      { label: "Voter questions", text: "Did not answer the Ohio Capital Journal's reader questionnaire as of July 2026.", src: "ocj_reader" }
    ],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "fact", display: "Accepted CNN invite", sub: "Not scored: no debate offered to all qualifying candidates was confirmed", src: "fox_self" },
      transparency: { status: "pending", note: "One questionnaire tracked; minimum is 3." },
      factcheck: { status: "verified", norm: 0.176, display: "1 of 17 rated mostly true or better", sub: "17 rulings: PolitiFact 12 · The Washington Post 4 · FactCheck.org 1 · 8 more use labels outside the standard scale and aren't scored", src: "claimreview", src2: "pf_ramaswamy",
        note: "Most date from his 2023 presidential campaign; one is from this race. Fact-checkers choose which claims to check, so the mix reflects attention as well as accuracy." },
      specificity: { status: "draft", from: "promises" }
    },
    promises: [
      { text: "Phase out Ohio's income tax over 10 years, starting with repeal of the capital gains tax.", src: "vivek_plan", outcome: "Not rated", spec: { m: 1, t: 1, c: 0, p: 1 }, evidence: [] },
      { text: "Reset property taxes to pre-pandemic levels in the first six months of 2027, then cap growth.", src: "wmoh_town", outcome: "Not rated", spec: { m: 1, t: 1, c: 0, p: 0 },
        evidence: [{ text: "Reporters note property tax rates are set locally, so the state mechanism is unclear.", src: "ocj_prop" }] },
      { text: "Introduce merit-based pay for teachers and administrators.", src: "san_launch", outcome: "Not rated", spec: { m: 1, t: 0, c: 0, p: 1 }, evidence: [] },
      { text: "Restart work requirements for Medicaid and welfare.", src: "san_launch", outcome: "Not rated", spec: { m: 1, t: 0, c: 0, p: 1 }, evidence: [] }
    ],
    positions: {
      taxes: { text: "Phase out income tax over 10 years; roll property taxes back to pre-pandemic levels and cap them.", src: "vivek_plan" },
      health: { text: "Medicaid work requirements; use anti-fraud savings to lower premiums.", src: "vivek_faq" },
      schools: { text: "Merit pay for teachers; add a stronger statewide piece to school funding.", src: "wmoh_town" },
      energy: { text: "Expand natural gas production to lower energy bills.", src: "vivek_plan" }
    }
  },
  acton: {
    name: "Amy Acton", party: "Democratic", role: "Open-seat candidate", track: "rookie", initials: "AA",
    ids: { factcheck: "Amy Acton" },
    facts: [
      { label: "Background", text: "Physician; former director of the Ohio Department of Health who led the state's early COVID-19 response; later worked at The Columbus Foundation. Has not held elected office.", src: "stateside_acton" },
      { label: "Debates", text: "Her campaign said she will not debate Ramaswamy.", src: "signal_debate" },
      { label: "Voter questions", text: "Did not answer the Ohio Capital Journal's reader questionnaire as of July 2026.", src: "ocj_reader" },
      { label: "Plan costs", text: "Released an affordability plan with few specifics on how it would be paid for.", src: "wysu_acton" }
    ],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "fact", display: "Declined debate", sub: "Not scored: no debate offered to all qualifying candidates was confirmed", src: "signal_debate" },
      transparency: { status: "pending", note: "One questionnaire tracked; minimum is 3." },
      factcheck: { status: "pending", note: "1 rated claim on PolitiFact (mostly false); minimum is 5.", src: "pf_acton" },
      specificity: { status: "draft", from: "promises" }
    },
    promises: [
      { text: "Pass a tax cut for working families as a top priority.", src: "trib_acton", outcome: "Not rated", spec: { m: 0, t: 0, c: 0, p: 1 }, evidence: [] },
      { text: "Launch Ohio Rx, an online platform to lower prescription drug costs.", src: "wysu_acton", outcome: "Not rated", spec: { m: 1, t: 0, c: 0, p: 1 }, evidence: [] },
      { text: "Honor the bipartisan school funding plan and fully fund public schools.", src: "cle19_acton", outcome: "Not rated", spec: { m: 1, t: 0, c: 0, p: 1 }, evidence: [] },
      { text: "Issue executive orders and a 100-day relief plan starting day one.", src: "cle19_acton", outcome: "Not rated", spec: { m: 0, t: 1, c: 0, p: 1 }, evidence: [] }
    ],
    positions: {
      taxes: { text: "Tax cut for lower- and middle-income Ohioans; property tax reductions.", src: "wtvg_acton" },
      health: { text: "Ohio Rx drug platform; insurance and hospital price transparency; crack down on surprise billing.", src: "wysu_acton" },
      schools: { text: "Fully fund public schools under the bipartisan funding plan.", src: "cle19_acton" },
      energy: { text: "Lower utility costs.", src: "wtvg_acton" }
    }
  },
  kissick: {
    name: "Don Kissick", party: "Libertarian", role: "Open-seat candidate", track: "rookie", initials: "DK",
    ids: { factcheck: "Don Kissick" },
    facts: [
      { label: "Background", text: "U.S. Navy veteran and TV station control-room operator from Ottawa, Ohio. Has run for office several times, including U.S. Senate in 2024.", src: "ivoter_kissick", src2: "ocj_reader" },
      { label: "Voter questions", text: "Answered the Ohio Capital Journal's reader questions on 12 topics.", src: "ocj_reader" },
      { label: "Debates", text: "Has publicly asked Ramaswamy to debate; no debate is scheduled.", src: "ddn_kissick" }
    ],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "fact", display: "Asked to debate", sub: "Not scored: no debate offered to all qualifying candidates was confirmed", src: "ddn_kissick" },
      transparency: { status: "pending", note: "One questionnaire tracked; minimum is 3." },
      factcheck: { status: "pending", note: "Fewer than 5 rated claims in this race found." },
      specificity: { status: "draft", from: "promises" }
    },
    promises: [
      { text: "Repeal Ohio's certificate-of-need laws for health care facilities.", src: "hometown_kissick", outcome: "Not rated", spec: { m: 1, t: 0, c: 0, p: 1 }, evidence: [] },
      { text: "Impose an immediate moratorium on new data center projects.", src: "ocj_datacenter", outcome: "Not rated", spec: { m: 1, t: 1, c: 0, p: 0 },
        evidence: [{ text: "A governor's authority to impose this alone is unclear." }] },
      { text: "Lower income taxes and end property taxes.", src: "ballotbrief_kissick", outcome: "Not rated", spec: { m: 0, t: 0, c: 0, p: 1 }, evidence: [] }
    ],
    positions: {
      taxes: { text: "Lower income taxes; end property taxes.", src: "ballotbrief_kissick" },
      health: { text: "Repeal certificate-of-need laws.", src: "hometown_kissick" },
      schools: null,
      energy: { text: "Moratorium on new data centers.", src: "ocj_datacenter" }
    }
  },

  /* ---------- fictional sample race ---------- */
  d_whitfield: {
    name: "Dana Whitfield", party: "Party A", role: "Incumbent · 3 terms", track: "veteran", initials: "DW", sample: true,
    facts: [{ label: "Prior office", text: "County treasurer for 8 years before Congress. (Sample)" }],
    stats: {
      promises: { status: "verified", norm: 0.64, display: "11 of 17 kept", sub: "+3 compromise · 3 broken" },
      effectiveness: { status: "verified", norm: 0.65, display: "1.44 LES", sub: "Benchmark 1.10 · exceeds" },
      attendance: { status: "verified", norm: 0.93, display: "98.6%", sub: "League median 97.8%" },
      bipartisan: { status: "verified", norm: 0.41, display: "29% of bills", sub: "League avg 34%" },
      access: { status: "verified", norm: 0.80, display: "8 town halls", sub: "Accepted 2 of 2 debates" },
      transparency: { status: "verified", norm: 0.90, display: "4 of 4", sub: "Disclosures + questionnaires" },
      factcheck: { status: "verified", norm: 0.67, display: "6 of 9 accurate", sub: "3 fact-checkers" },
      specificity: { status: "verified", norm: 0.55, display: "2.2 / 4", sub: "Across 17 promises" }
    },
    promises: [
      { text: "Secure funding to replace the Route 40 river bridge by 2026.", outcome: "Kept", effort: true, spec: { m: 1, t: 1, c: 1, p: 1 }, evidence: [{ text: "Sample evidence." }] },
      { text: "Pass a rural broadband bill.", outcome: "Broken", effort: true, spec: { m: 1, t: 0, c: 0, p: 1 }, evidence: [{ text: "Bill passed committee; failed floor vote. Effort credited." }] }
    ],
    positions: { roads: { text: "Bridge and highway funding." }, money: { text: "Supports disclosure rules." }, cost: { text: "Child care tax credit." } }
  },
  d_oyelaran: {
    name: "Marcus Oyelaran", party: "Party B", role: "Challenger · ex-county commissioner", track: "rookie", initials: "MO", sample: true,
    facts: [{ label: "Prior office", text: "Two terms on the county commission; led a jail-budget audit. (Sample)" }],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "verified", norm: 0.95, display: "14 town halls", sub: "Accepted 2 of 2 debates" },
      transparency: { status: "verified", norm: 1, display: "5 of 5", sub: "Disclosures + questionnaires" },
      factcheck: { status: "verified", norm: 0.55, display: "5 of 9 accurate", sub: "3 fact-checkers" },
      specificity: { status: "verified", norm: 0.78, display: "3.1 / 4", sub: "Across 12 promises" }
    },
    promises: [{ text: "Publish a costed plan for a regional transit line within 90 days of taking office.", outcome: "Not rated", spec: { m: 1, t: 1, c: 1, p: 1 }, evidence: [] }],
    positions: { roads: { text: "Regional transit line." }, money: { text: "Ban on stock trading by members." }, cost: { text: "Housing supply grants." } }
  },
  d_tran: {
    name: "Jo Tran", party: "Independent", role: "First-time candidate", track: "rookie", initials: "JT", sample: true,
    facts: [{ label: "Background", text: "Small-business owner; no prior office. (Sample)" }],
    stats: {
      promises: { status: "na" }, effectiveness: { status: "na" }, attendance: { status: "na" }, bipartisan: { status: "na" },
      access: { status: "verified", norm: 0.60, display: "3 town halls", sub: "Accepted 1 of 2 debates" },
      transparency: { status: "verified", norm: 0.60, display: "3 of 5", sub: "Disclosures + questionnaires" },
      factcheck: { status: "pending", note: "Only 2 rated claims; minimum is 5." },
      specificity: { status: "verified", norm: 0.35, display: "1.4 / 4", sub: "Across 6 promises" }
    },
    promises: [{ text: "Bring back common sense to Washington.", outcome: "Not rated", spec: { m: 0, t: 0, c: 0, p: 0 }, evidence: [] }],
    positions: { roads: null, money: { text: "Term limits." }, cost: { text: "Lower prices." } }
  }
};

const POSITION_TOPICS = {
  house: [{ key: "roads", label: "Roads and infrastructure" }, { key: "money", label: "Money in politics" }, { key: "cost", label: "Cost of living" }],
  governor: [{ key: "taxes", label: "Taxes" }, { key: "health", label: "Health care" }, { key: "schools", label: "Schools" }, { key: "energy", label: "Energy and data centers" }]
};

/* Data feeds: what's connected, how, and when it last ran. */
const FEEDS = [
  { name: "Legislative Effectiveness Scores", org: "Center for Effective Lawmaking", stat: "Lawmaking effectiveness", state: "live", how: "CEL scores API", last: "Oct 24, 2026", note: "118th Congress; 119th scores publish after the term ends." },
  { name: "Campaign finance", org: "Federal Election Commission", stat: "Campaign money (context)", state: "live", how: "OpenFEC API", last: "Oct 24, 2026", note: "Every Arkansas federal candidate the FEC lists. State races report to state offices (not yet connected)." },
  { name: "Fact-check rulings", org: "PolitiFact, The Washington Post, FactCheck.org and others", stat: "Fact-check record", state: "live", how: "Google Fact Check Tools (ClaimReview)", last: "Oct 24, 2026", note: "Labels outside the standard scale (\"Baseless\", \"Lacks evidence\") are shown but not scored." },
  { name: "ZIP to district", org: "U.S. Census Bureau via OpenSourceActivismTech", stat: "Ballot lookup", state: "live", how: "ZCTA relationship files, 119th Congress map", last: "Oct 23, 2026", note: "About 15% of ZIPs span two districts; the page asks you to confirm." },
  { name: "Member IDs", org: "@unitedstates congress-legislators", stat: "Links every dataset", state: "live", how: "Public YAML dataset", last: "Oct 23, 2026", note: "Bioguide, FEC and GovTrack IDs for all 539 current members." },
  { name: "State legislative effectiveness", org: "Center for Effective Lawmaking", stat: "Lawmaking effectiveness (state)", state: "live", how: "CEL state scores API", last: "Oct 24, 2026", note: "Arkansas House and Senate, 2023–24 term. Newer terms publish after they end." },
  { name: "Senate roll-call votes", org: "Voteview (UCLA), from U.S. Senate records", stat: "Attendance (Senate)", state: "live", how: "Voteview vote files", last: "Oct 24, 2026", note: "915 Senate roll calls in the 119th Congress. senate.gov refuses automated downloads." },
  { name: "Roll-call votes", org: "Office of the Clerk, U.S. House", stat: "Attendance", state: "live", how: "Clerk roll-call XML", last: "Oct 24, 2026", note: "676 roll calls since Jan 2025. Each night adds only new votes." },
  { name: "Bills and cosponsors", org: "Congress.gov API", stat: "Bipartisanship", state: "live", how: "Sponsored bills and cosponsors", last: "Oct 24, 2026", note: "Bills and joint resolutions only; simple resolutions are mostly ceremonial and left out." },
  { name: "Candidate questionnaires", org: "Vote411, Ballotpedia, newsrooms", stat: "Transparency", state: "next", how: "Manual tracking", last: "—", note: "Tracked by reviewers." },
  { name: "Promise ledgers", org: "Campaign sites, speeches, ads", stat: "Promises, specificity", state: "manual", how: "AI-assisted extraction + human review", last: "Oct 23, 2026", note: "All entries are drafts until two reviewers sign off." }
];

/* ===== Fantasy demo league: fictional players only ===== */
const PLAYERS = [
  { id: "p1", name: "Gov. Rhea Calder", pos: "QB", party: "A", team: "Midwest", status: "Active", pts: 31.5, events: [["Promise kept: on-time budget", 10], ["Budget enacted on time", 5], ["Town hall (noticed)", 2], ["Promise-linked executive action", 3], ["Fact-check: accurate", 2], ["Promise kept: broadband grants", 10], ["Effort step on housing promise", 2], ["Fact-check: false", -3]] },
  { id: "p2", name: "Gov. Tomas Ilves", pos: "QB", party: "B", team: "West", status: "Limited", pts: 12, events: [["Promise compromise: transit", 4], ["Promise-linked executive action", 3], ["Town hall (noticed)", 2], ["Effort step on water promise", 2], ["Debate accepted", 3], ["Fact-check: false", -3], ["Promise-linked executive action", 3], ["Fact-check: false", -3]] },
  { id: "p3", name: "Sen. Ada Marchetti", pos: "WR", party: "B", team: "Northeast", status: "Active", pts: 24.4, events: [["Bill passed chamber", 6], ["Cross-party cosponsors", 2], ["12 votes cast", 2.4], ["Promise kept: veterans clinic", 10], ["Town hall (noticed)", 2], ["Fact-check: accurate", 2]] },
  { id: "p4", name: "Sen. Cole Harlan", pos: "WR", party: "A", team: "South", status: "Active", pts: 18.2, events: [["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["11 votes cast", 2.2], ["Unexcused vote missed", -1], ["Promise compromise: farm bill", 4], ["Effort step on rail promise", 2], ["Bill passed committee", 3], ["Debate accepted", 3]] },
  { id: "p5", name: "Sen. Imani Okafor", pos: "WR", party: "A", team: "Midwest", status: "Active", pts: 15.4, events: [["Bill became law", 12], ["12 votes cast", 2.4], ["Unexcused vote missed", -1], ["Town hall (noticed)", 2]] },
  { id: "p6", name: "Sen. Pete Lindqvist", pos: "WR", party: "I", team: "West", status: "Inactive", pts: -2, events: [["Unexcused vote missed", -1], ["Unexcused vote missed", -1]] },
  { id: "p7", name: "Rep. Lena Ruiz", pos: "RB", party: "B", team: "West", status: "Active", pts: 21.4, events: [["Bill passed chamber", 6], ["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["12 votes cast", 2.4], ["Promise kept: port dredging", 10], ["Unexcused vote missed", -1], ["Fact-check: false", -3], ["Town hall (noticed)", 2]] },
  { id: "p8", name: "Rep. Gus Brandt", pos: "RB", party: "A", team: "Midwest", status: "Active", pts: 17.4, events: [["Bill passed committee", 3], ["12 votes cast", 2.4], ["Promise kept: bridge funding", 10], ["Effort step on rural clinics", 2]] },
  { id: "p9", name: "Rep. Nia Holloway", pos: "RB", party: "A", team: "South", status: "Active", pts: 14.4, events: [["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["12 votes cast", 2.4], ["Promise compromise: flood maps", 4], ["Town hall (noticed)", 2], ["Debate accepted", 3], ["Fact-check: false", -3], ["Fact-check: accurate", 1]] },
  { id: "p10", name: "Rep. Owen Paik", pos: "RB", party: "B", team: "Northeast", status: "Active", pts: 11.2, events: [["Bill passed committee", 3], ["12 votes cast", 2.4], ["Cross-party cosponsors", 2], ["Town hall (noticed)", 2], ["Effort step on rail promise", 2], ["Unexcused vote missed", -1], ["Fact-check: accurate", 0.8]] },
  { id: "p11", name: "Rep. Sal Ferrante", pos: "RB", party: "I", team: "Northeast", status: "Limited", pts: 6.4, events: [["10 votes cast", 2], ["Unexcused vote missed", -1], ["Unexcused vote missed", -1], ["Town hall (noticed)", 2], ["Cross-party cosponsors", 2], ["Debate accepted", 3], ["Fact-check: false", -3], ["Effort step on tax promise", 2.4]] },
  { id: "p12", name: "Rep. June Abara", pos: "RB", party: "B", team: "South", status: "Active", pts: 9.8, events: [["Bill passed committee", 3], ["12 votes cast", 2.4], ["Town hall (noticed)", 2], ["Effort step on child care", 2], ["Fact-check: accurate", 2], ["Unexcused vote missed", -1], ["Fact-check: false", -0.6]] },
  { id: "p13", name: "Gov. Bea Lindell", pos: "QB", party: "I", team: "Northeast", status: "Active", pts: 19, events: [["Promise kept: tuition freeze", 10], ["Promise-linked executive action", 3], ["Budget enacted on time", 5], ["Promise broken: road levy", -8], ["Town hall (noticed)", 2], ["Debate accepted", 3], ["Effort step on housing", 2], ["Fact-check: accurate", 2]] },
  { id: "p14", name: "Sen. Hal Mercer", pos: "WR", party: "B", team: "South", status: "Active", pts: 13.2, events: [["Bill passed committee", 3], ["Cross-party cosponsors", 2], ["11 votes cast", 2.2], ["Promise compromise: VA backlog", 4], ["Town hall (noticed)", 2]] }
];
const OPPONENT = { name: "The Filibusters", roster: ["p2", "p4", "p6", "p9", "p10", "p11"] };
const DEFAULT_ROSTER = { QB: "p1", WR1: "p3", WR2: "p5", RB1: "p7", RB2: "p8", FLEX: "p12" };
const SLOTS = [["QB", "QB"], ["WR1", "WR"], ["WR2", "WR"], ["RB1", "RB"], ["RB2", "RB"], ["FLEX", "FLEX"]];

const SCORING = [
  ["Promise rated Kept", "+10"], ["Promise rated Compromise", "+4"], ["Promise rated Broken", "−8"], ["Effort step on a promise", "+2"],
  ["Sponsored bill passes committee", "+3"], ["Sponsored bill passes chamber", "+6"], ["Sponsored bill becomes law", "+12"],
  ["Bill with cross-party cosponsors", "+2"], ["Vote cast", "+0.2"], ["Unexcused vote missed", "−1"],
  ["Governor: budget enacted on time", "+5"], ["Governor: promise-linked executive action", "+3"],
  ["Town hall with public notice", "+2"], ["Nonpartisan debate accepted / declined", "+3 / −3"],
  ["Fact-check rated accurate / false", "+2 / −3"], ["Earmark dollars, policy direction of any vote", "Never scored"]
];

const DAILY = [
  { q: "Who sets most local property tax rates in Ohio?", opts: ["The governor", "The Ohio Senate", "Local governments and voters", "The federal government"], a: 2,
    why: "Rates are set locally, and levies above 10 mills go to voters. That's why our specificity check asks whether a promise is within the office's power." },
  { q: "What does a Legislative Effectiveness Score of 1.0 mean?", opts: ["Perfect score", "Exactly league average", "Passed one bill", "Lowest possible"], a: 1,
    why: "The Center for Effective Lawmaking normalizes scores so the average member of each Congress is 1.0." },
  { q: "An earmark is officially called what in the House?", opts: ["A rider", "Community Project Funding", "A block grant", "A continuing resolution"], a: 1,
    why: "Members request Community Project Funding for specific local projects inside appropriations bills." },
  { q: "Why do we keep 'effort' separate from 'outcome' on promises?", opts: ["To make scores higher", "Minority-party members can't pass bills alone", "Outcomes are unknowable", "It's a legal requirement"], a: 1,
    why: "A member can push hard and still lose a floor vote. Tracking effort keeps the score fair across majority and minority parties." },
  { q: "How many votes does a bill need to pass the full U.S. House?", opts: ["51", "60", "218 when all seats are filled", "290"], a: 2,
    why: "A simple majority of 435 members is 218." },
  { q: "Which of these does Stump League never score?", opts: ["Attendance", "Promise outcomes", "How someone voted on an issue", "Fact-check record"], a: 2,
    why: "We score performance and transparency. Whether you agree with a vote is your call." },
  { q: "Why is a 3-for-3 kept rate not automatically elite?", opts: ["Small sample and possibly vague promises", "Three is unlucky", "Only incumbents count", "It always is"], a: 0,
    why: "Few promises means a noisy rate, and vague promises are easy to call kept. We show the count and weight by specificity." }
];

const LESSONS = [
  { t: "How to read a player card", m: "2 min", body: [
    "Every stat line shows three things: the number, what league average looks like, and where the number came from.",
    "A gold check means a reviewer verified it. A dashed outline means it is a draft rating waiting on review. Grey means the data has not been collected yet.",
    "The tier at the top only appears once at least 4 verified stats exist. Below that, you get the facts without a grade." ] },
  { t: "What is an earmark?", m: "2 min", body: [
    "House members can request money for specific local projects inside spending bills. The House calls these Community Project Funding.",
    "Totals depend heavily on seniority and committee seats, and some members refuse earmarks on principle. That's why we show earmark dollars as context next to peers, and never score them." ] },
  { t: "What a governor can and can't do", m: "2 min", body: [
    "In Ohio, the governor signs or vetoes bills, proposes the budget, and appoints officials like utility regulators and university trustees.",
    "The governor can't pass a law without the legislature, and local property tax rates are set locally. A promise outside the office's power gets a lower specificity score." ] },
  { t: "How a bill becomes law", m: "3 min", body: [
    "A member introduces a bill. A committee may hold hearings and vote. If it passes committee, leaders decide whether it reaches the floor.",
    "It must pass both chambers in identical form, then the president or governor signs or vetoes it. Most bills never leave committee, which is why passing committee earns points on its own." ] },
  { t: "Why we never score positions", m: "1 min", body: [
    "Two people can look at the same vote and see opposite things. So we score whether candidates did what they said and showed up for the job.",
    "Positions appear side by side, unscored, and the optional quiz lets you weight what matters to you." ] }
];
