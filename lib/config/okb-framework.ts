export const FRAMEWORK_META = {
  title: "Operational Framework of Oplan Kontra Baha",
  documentTitle: "Memorandum: Operational Framework of the Oplan Kontra Baha",
  dateIssued: "4 September 2026",
  authority: "Office of the Secretary, Department of Public Works and Highways",
  signedBy: "Vivencio B. Dizon",
  signedTitle: "Secretary",
  tracking: "SVBD-2026-05062",
  directive: "Presidential Directive No. PBBM-2025-1777–1780 (19 November 2025)",
  specialOrder: "DPWH Special Order No. 06, s. 2026",
  departmentOrder: "D.O. No. 132, s. 2025",
  wasteLaw: "Republic Act No. 9003",
} as const;

export const RIDGE_TO_REEF_ZONES = [
  {
    id: "ridge",
    label: "Ridge",
    lead: "Uplands and watersheds",
    body: "Rainfall, runoff, and eroded soil begin here. Upstream conditions are assessed first so silt and debris are not simply moved to the next community downstream.",
  },
  {
    id: "river",
    label: "Rivers and creeks",
    lead: "Conveyance channels",
    body: "Dredging, desilting, and the removal of solid waste, vegetation, and obstructions restore the carrying capacity of rivers, creeks, and esteros.",
  },
  {
    id: "floodplain",
    label: "Floodplain",
    lead: "Cities and drainage",
    body: "Drainage lines, manholes, catch basins, culverts, and outfalls are declogged, while pumping stations are maintained and mobile pumps are staged where flooding is worst.",
  },
  {
    id: "estuary",
    label: "Estuary",
    lead: "Tidal outlets",
    body: "Discharge points are kept clear and recurring solid-waste accumulation is controlled at source with LGUs, DENR, and MMDA.",
  },
  {
    id: "reef",
    label: "Coast and reef",
    lead: "Receiving waters",
    body: "Dredged material and debris are disposed of under environmental safeguards so coastal waters and reefs are protected at the end of the system.",
  },
] as const;

export const FRAMEWORK_MECHANISM = [
  "Identification",
  "Assessment",
  "Prioritization",
  "Implementation",
  "Monitoring",
  "Sustained maintenance",
] as const;

export const GUIDING_PRINCIPLES = [
  {
    id: "ridge-to-reef",
    letter: "A",
    title: "Ridge-to-Reef Approach",
    body: "Hydrologic interconnection from uplands and watersheds through rivers, floodplains, and estuaries to coastal areas. Interventions must consider both upstream and downstream conditions so flooding or siltation is not transferred from one community to another.",
  },
  {
    id: "whole-of-nation",
    letter: "B",
    title: "Whole-of-Nation Approach",
    body: "Coordinated action among DPWH offices, national agencies, LGUs, the private sector, communities, and other stakeholders — each respecting respective mandates and accountabilities.",
  },
  {
    id: "risk-based",
    letter: "C",
    title: "Risk-Based Prioritization",
    body: "Resources go where they can reduce flood risk and protect public safety the most — considering population affected, critical facilities, hydraulic functionality, and operational urgency.",
  },
  {
    id: "preventive",
    letter: "D",
    title: "Preventive and Sustained Maintenance",
    body: "Periodic and preventive care is preferred over reactive work after flooding. Maintenance is a continuous cycle, not a one-time clearing event.",
  },
  {
    id: "evidence",
    letter: "E",
    title: "Evidence-Based Decision-Making",
    body: "Planning and deployment rest on field inspection, measurements, geotagged photographs, flood information, and equipment records.",
  },
  {
    id: "accountability",
    letter: "F",
    title: "Accountability and Data Integrity",
    body: "Reporting must be accurate, consistent, and verifiable — grounded in measurable data, field conditions, and documented operations.",
  },
  {
    id: "environment",
    letter: "G",
    title: "Environmental Responsibility",
    body: "Operations comply with environmental laws on water and solid waste, easements, disposal, occupational safety, and permitting.",
  },
  {
    id: "complementarity",
    letter: "H",
    title: "Complementarity of Maintenance and Structure",
    body: "Maintenance restores function but does not replace large-scale structural flood control. Complex issues are referred for engineering or policy action.",
  },
] as const;

export const FRAMEWORK_OBJECTIVES = [
  "Restore and maintain the carrying capacity of waterways, drainage systems, and flood-control facilities.",
  "Remove silt, solid waste, debris, vegetation, and other obstructions that impede water flow.",
  "Reduce the duration, extent, frequency, and impacts of flooding through maintenance and operations.",
  "Institutionalize regular, preventive, and condition-based maintenance instead of reacting after floods.",
  "Establish a systematic, objective, and risk-based mechanism for identifying and prioritizing interventions.",
  "Promote coordinated action among DPWH offices, agencies, LGUs, private partners, and communities.",
  "Treat solid waste management and environmental protection as integral to sustainable flood mitigation.",
  "Establish uniform, measurable, accurate, and verifiable accomplishment and performance indicators.",
  "Strengthen monitoring of completed works and set maintenance cycles that prevent recurrence.",
  "Elevate structural, jurisdictional, and environmental conditions that regular OKB operations cannot solve.",
] as const;

export const INTERVENTION_SCOPES = [
  {
    id: "waterways",
    title: "Waterway Restoration and Maintenance",
    items: [
      "Dredging and desilting of rivers, creeks, esteros, channels, and other waterways",
      "Removal of solid waste, debris, vegetation, and other obstructions",
      "Clearing of sections needed to restore or improve conveyance",
      "Treatment of flow obstructions subject to applicable laws and permits",
      "Minor restoration works needed to restore waterway functionality",
    ],
    note: "Land- and water-based equipment — amphibious excavators, dredgers, trash skimmers, and cutter suction dredgers — with manpower for multiple operational shifts.",
  },
  {
    id: "drainage",
    title: "Drainage System Maintenance",
    items: [
      "Declogging and cleaning of drainage lines",
      "Cleaning and desilting of manholes, catch basins, inlets, outfalls, and culverts",
      "Removal of obstructions at outlets and discharge points",
      "Maintenance of open drainage channels",
      "Endorsement of facilities needing repair or upgrading under D.O. No. 132, s. 2025",
      "Documentation of drainage bottlenecks that need major engineering",
    ],
    note: "Vacuum sewer jet cleaners, water tank trucks, small backhoes, and dump trucks — with extensive manual labor where heavy machinery cannot reach.",
  },
  {
    id: "facilities",
    title: "Flood Control Facility Rehabilitation",
    items: [
      "Maintenance of DPWH-managed pumping and booster stations",
      "Strategic deployment of mobile pumps based on site conditions",
      "Coordination with LGUs and partner agencies for timely flood mitigation",
    ],
    note: "Addresses operational deficiencies, structural deterioration, and damage in accordance with D.O. No. 132, s. 2025.",
  },
  {
    id: "waste",
    title: "Solid Waste and Environmental Management",
    items: [
      "Collection and disposal of waste, debris, and silt with LGUs, DENR, and MMDA",
      "Procurement of waste-removal services in intervention areas",
      "Source-control of recurring solid-waste accumulation points",
      "Environmental safeguards during dredging, desilting, and clearing",
      "Reporting of unlawful dumping, encroachments, and related violations",
    ],
    note: "Aligned with Republic Act No. 9003.",
  },
  {
    id: "monitoring",
    title: "Assessment, Monitoring, and Maintenance",
    items: [
      "Regular inspections of waterways and drainage systems",
      "Periodic monitoring of completed areas",
      "Determination of future maintenance requirements",
    ],
    note: "Completed works re-enter the maintenance cycle so obstructions do not return.",
  },
  {
    id: "research",
    title: "Research and Development",
    items: [
      "Testing innovative, cost-effective, and scalable flood-control methods",
      "Evaluating new materials and technologies against conventional practice",
      "Supporting sustainable long-term solutions",
    ],
    note: "OKB is a living operational program, not a static project list.",
  },
] as const;

export const GOVERNANCE_ROLES = [
  {
    id: "secretary",
    title: "Secretary of Public Works and Highways",
    body: "Overall policy direction and supervision. Handles major policy, resource requirements, and issues that need Department-level or inter-agency action.",
  },
  {
    id: "task-force",
    title: "OKB Task Force",
    body: "Principal coordinating and oversight mechanism under Special Order No. 06, s. 2026 — priorities, equipment mobilization, uniform standards, consolidated reporting, and recommendations to the Secretary.",
  },
  {
    id: "commander",
    title: "Task Force Commander",
    body: "Coordinates overall implementation of OKB through authorities assigned by Special Order.",
  },
  {
    id: "secretariat",
    title: "Secretariat and Technical Working Group",
    body: "Secretariat, technical, monitoring, administrative, and coordination support — consolidating reports, maintaining program data, and preparing situation and accomplishment reports.",
  },
  {
    id: "regional",
    title: "Regional Director",
    body: "Regional OKB Task Group Commander: supervision, validation of priorities, coordination among District Engineering Offices, resource augmentation, and elevation of unresolved needs.",
  },
  {
    id: "district",
    title: "District Engineering Offices",
    body: "Principal field implementing units — assessment, intervention planning, authorized works, stakeholder coordination, records, post-intervention inspection, and referral of matters beyond mandate.",
  },
  {
    id: "bureaus",
    title: "Bureaus, Services, and Implementing Units",
    body: "Technical, equipment, administrative, financial, legal, procurement, logistical, and other support to field operations.",
  },
] as const;

export const OPERATIONAL_CYCLE = [
  {
    id: "identification",
    title: "Identification",
    body: "Field inspections, flood history, DPWH reports, LGU requests, government directives, and official information systems.",
  },
  {
    id: "assessment",
    title: "Assessment and Validation",
    body: "Nature and extent of the problem, obstructions, quantities, hydraulic conditions, flood history, people and facilities affected, access, and jurisdiction.",
  },
  {
    id: "planning",
    title: "Intervention Planning",
    body: "Location, problem, proposed work, target output, responsible office, equipment and manpower, logistics, permits, safety, and schedule.",
  },
  {
    id: "mobilization",
    title: "Resource Mobilization",
    body: "Use local resources first, then escalate for regional or Task Force augmentation — considering access, equipment condition, operators, tides, safety, fuel, and maintenance.",
  },
  {
    id: "implementation",
    title: "Implementation",
    body: "Field operations follow engineering, environmental, safety, and traffic requirements, and may pause when weather or water levels endanger personnel.",
  },
  {
    id: "validation",
    title: "Accomplishment Validation",
    body: "Geotagged before, during, and after photographs, coordinates, area cleared, volume removed, man-hours, and disposal records — estimated versus actual.",
  },
  {
    id: "post",
    title: "Post-Intervention Assessment",
    body: "Confirm restored functionality, identify remaining work, and place the area on a periodic maintenance schedule.",
  },
  {
    id: "monitor",
    title: "Monitoring and Maintenance",
    body: "Uniform reporting on location, problem, priority, resources used, and follow-up — from Districts through Regions to the national Task Force system.",
  },
] as const;

export const PERFORMANCE = {
  outputs: [
    "Length cleared or desilted",
    "Volume of materials removed",
    "Priority areas addressed",
    "Facilities maintained or rehabilitated",
    "Share of programmed interventions completed",
  ],
  outcomes: [
    "Restored hydraulic functionality",
    "Reduced critical obstruction and recurrence",
    "Improved response time",
    "Compliance with maintenance schedules",
    "Reduced flood duration, depth, or extent",
  ],
  note: "Performance is not measured solely by the number of personnel or equipment deployed.",
} as const;

export const MAINTENANCE_TYPES = [
  {
    id: "routine",
    title: "Routine Maintenance",
    body: "Regularly scheduled cleaning and minor repairs.",
  },
  {
    id: "pre-rainy",
    title: "Pre-Rainy Season",
    body: "Preventive actions taken before heavy rainfall.",
  },
  {
    id: "post-event",
    title: "Post-Event Maintenance",
    body: "Clearing after typhoons or major flooding.",
  },
  {
    id: "condition",
    title: "Condition-Based",
    body: "Triggered when monitoring shows siltation or obstruction has reached a critical level.",
  },
  {
    id: "urgent",
    title: "Urgent or Emergency",
    body: "Immediate response to imminent threats to public safety or infrastructure.",
  },
] as const;

export const PARTNERS = [
  {
    id: "dpwh",
    title: "DPWH",
    body: "Technical assessment, planning, implementation, equipment and manpower, and monitoring.",
  },
  {
    id: "lgu",
    title: "LGUs and Barangays",
    body: "Local drainage and waterway support, waste source control, access, traffic, community coordination, and local ordinances.",
  },
  {
    id: "nga",
    title: "National Agencies",
    body: "Permits, technical assistance, environmental safeguards, logistics, and utilities coordination.",
  },
  {
    id: "private",
    title: "Private Sector and Communities",
    body: "Information sharing, mobilization, site access, and waste reduction — without transferring statutory mandates.",
  },
] as const;
