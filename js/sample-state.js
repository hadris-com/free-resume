export function createSampleStateBuilders({ getState, sanitizeResumeState }) {
  function buildSampleResumeState() {
    const state = getState();

    return sanitizeResumeState({
      uiLang: state.uiLang,
      cvLang: state.cvLang,
      template: state.template,
      theme: state.theme,
      showSkills: true,
      showSkillLevels: false,
      alpineLocationInHeader: state.alpineLocationInHeader,
      profile: {
        name: "Lena Hoffmann",
        title: "Senior Product Designer",
        email: "lena.hoffmann@example.com",
        phone: "+49 30 1234 5678",
        location: "Berlin, Germany",
        website: "lenahoffmann.design",
        linkedin: "linkedin.com/in/lenahoffmann",
        github: "github.com/lenahoffmann"
      },
      summary:
        "Product designer with 8+ years building end-to-end digital products for SaaS and consumer platforms. I turn research into clear interaction systems, partner closely with engineering, and ship accessible interfaces that improve adoption and retention.",
      experience: [
        {
          role: "Senior Product Designer",
          company: "Nordlicht Cloud",
          location: "Berlin, Germany",
          start: "Jan 2022",
          end: "Present",
          bullets:
            "Led redesign of onboarding flow, reducing drop-off by 29%.\nBuilt a component library with design tokens used across 4 product teams.\nPartnered with PM and engineering to ship roadmap features every sprint."
        },
        {
          role: "Product Designer",
          company: "Blueframe Labs",
          location: "Berlin, Germany",
          start: "Mar 2018",
          end: "Dec 2021",
          bullets:
            "Created responsive UX patterns for dashboard, billing, and analytics modules.\nRan usability tests and converted findings into prioritized product improvements.\nDefined interaction specs and states to speed up implementation handoff."
        },
        {
          role: "UX Designer",
          company: "Helio Commerce",
          location: "Berlin, Germany",
          start: "Jun 2016",
          end: "Feb 2018",
          bullets:
            "Redesigned checkout and account flows, improving conversion and repeat purchases.\nCollaborated with engineers to implement a reusable UI kit across web surfaces.\nMapped customer journeys and identified friction points across the funnel."
        },
        {
          role: "Visual Designer",
          company: "Brightside Agency",
          location: "Berlin, Germany",
          start: "Sep 2014",
          end: "May 2016",
          bullets:
            "Delivered brand and digital design systems for early-stage technology clients.\nProduced high-fidelity web and marketing assets with clear design rationale.\nSupported stakeholder workshops to align design direction and business goals."
        },
        {
          role: "Design Intern",
          company: "Studio Mitte",
          location: "Berlin, Germany",
          start: "Jun 2013",
          end: "Aug 2014",
          bullets:
            "Assisted with wireframes, prototypes, and visual explorations for client projects.\nPrepared design specs and asset exports for front-end implementation.\nContributed to user interviews and synthesized notes into actionable insights."
        }
      ],
      education: [
        {
          degree: "B.A. in Interaction Design",
          school: "Berlin University of the Arts",
          location: "Berlin, Germany",
          start: "Sep 2012",
          end: "Jun 2016"
        }
      ],
      skills: [
        { name: "Product Strategy", level: "expert", showLevel: false },
        { name: "UX Research", level: "advanced", showLevel: false },
        { name: "Interaction Design", level: "expert", showLevel: false },
        { name: "Design Systems", level: "advanced", showLevel: false },
        { name: "Figma", level: "expert", showLevel: false },
        { name: "Prototyping", level: "advanced", showLevel: false },
        { name: "Accessibility", level: "advanced", showLevel: false },
        { name: "HTML/CSS", level: "intermediate", showLevel: false }
      ],
      languages: [
        { name: "German", level: "expert", showLevel: false },
        { name: "English", level: "advanced", showLevel: false },
        { name: "Spanish", level: "intermediate", showLevel: false }
      ]
    });
  }

  function buildEmptyResumeState() {
    const state = getState();

    return sanitizeResumeState({
      uiLang: state.uiLang,
      cvLang: state.cvLang,
      template: state.template,
      theme: state.theme,
      showSkills: false,
      showSkillLevels: false,
      showLanguageLevels: false,
      alpineLocationInHeader: state.alpineLocationInHeader,
      profile: {
        name: "",
        title: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        linkedin: "",
        github: ""
      },
      summary: "",
      experience: [],
      education: [],
      skills: [],
      languages: []
    });
  }

  return {
    buildSampleResumeState,
    buildEmptyResumeState
  };
}
