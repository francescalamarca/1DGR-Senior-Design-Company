// src/features/profile/edit/profileEdit.constants.ts

/*
these are features that are company specifc
*/


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

//answers the question of how old the company is and how long it has been running for
export const BUSINESS_AGE_OPTIONS = ["Up to 1", "1-3", "3-5", "5-10", "10+"];

export const WORK_TYPE_OPTIONS = ["Part-Time", "Full Time", "Contract", "All", "Currently not looking"];

export const WORK_PREFERENCE_OPTIONS = ["Remote", "Willing to relocate", "Both"];

//these will come down in the dropdown of the core values options that can be attached to company profile
export const CORE_VALUES = ["Integrity", "Innovation", "Teamwork", 
  "Customer-First", "Excellence", "Diversity and Inclusion","Collaboration", "Adaptability"];

//setting a constant here should only be able to have 5
export const MAX_CORE_VALUES = 5;

//for the ACCOUNT SECTION
export const ACCOUNT_PRIVACY_OPTIONS = ["Privacy", "Profile View", "Description"];

export const ACCOUNT_DETAIL_OPTIONS = ["Premium", "Details", "Summary", "Subscription"];

export const THEME_OPTIONS = ["Light Mode", "Dark Mode"];

//make it max 500 words
export const MISSION_STATEMENT_MAX_LENGTH = 500;

//benefits summary also max 500 words
export const BENEFITS_SUM_MAX_LENGTH = 500;

//management style summary/PTO
export const MANAGE_STYLE_MAX_LENGTH = 500;