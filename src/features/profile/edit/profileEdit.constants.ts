// src/features/profile/edit/profileEdit.constants.ts
export const INDUSTRIES: { title: string; options: string[] }[] = [
  { title: "Technology", options: ["Software & IT", "Hardware & Electronics", "Telecom", "Internet & Digital Services"] },
  { title: "Healthcare & Life Sciences", options: ["Healthcare Services", "Pharmaceuticals & Biotechnology", "Medical Devices", "Health Insurance"] },
  { title: "Financial Services", options: ["Banking", "Investment & Asset Management", "Insurance", "Accounting & Finance", "FinTech"] },
  { title: "Professional & Business Services", options: ["Consulting", "Legal Services", "HR & Staffing", "Marketing, Advertising & PR", "Business Services"] },
  { title: "Manufacturing & Industrial", options: ["Manufacturing", "Industrial Equipment & Machinery", "Automotive", "Aerospace & Defense", "Chemicals & Materials"] },
  { title: "Energy & Utilities", options: ["Oil & Gas", "Renewable Energy", "Utilities"] },
  { title: "Construction & Real Estate", options: ["Construction", "Engineering & Architecture", "Real Estate (Commercial & Residential)", "Property Management"] },
  { title: "Transportation & Logistics", options: ["Transportation", "Logistics & Supply Chain", "Aviation"] },
  { title: "Retail & Consumer Goods", options: ["Retail (In-store & E-commerce)", "Consumer Products", "Wholesale & Distribution"] },
  { title: "Food, Beverage & Hospitality", options: ["Food & Beverage", "Restaurants", "Hotels & Travel", "Special Events"] },
  { title: "Media, Entertainment & Sports", options: ["Media & Publishing", "Social Media", "Entertainment & Film", "Sports"] },
  { title: "Education & Research", options: ["Education (K-12 & Higher Ed)", "EdTech", "Training & Development", "Research Institutions"] },
  { title: "Government & Nonprofit", options: ["Government", "Public Sector", "Nonprofit & NGO", "Public Safety & Defense"] },
  { title: "Agriculture & Environmental", options: ["Agriculture & Food Systems", "Environmental Services", "Sustainability & Climate"] },
  { title: "Consumer & Personal Services", options: ["Personal Services", "Health, Fitness & Wellness", "Home & Repair Services"] },
  { title: "Other / Emerging Industries", options: ["Startups", "Climate Tech", "Space & Advanced Tech", "Other"] },
];

export const INDUSTRY_EXPERIENCE_OPTIONS = ["Up to 1", "1-3", "3-5", "5-10", "10+"];

export const WORK_TYPE_OPTIONS = ["Part-Time", "Full Time", "Contract", "All", "Currently not looking"];

export const WORK_PREFERENCE_OPTIONS = ["Remote", "Willing to relocate", "Both"];

export const DEGREE_OPTIONS = [
  "Associates",
  "Bachelors",
  "Masters",
  "PHD",
  "Professional Doctorate (MD/JD/etc.)",
  "Certificate",
  "Other",
];
