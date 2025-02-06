// Google Material Design inspired component styles
export const buttonStyles = {
  base: "inline-flex items-center justify-center font-medium transition-colors duration-200 google-sans focus:outline-none focus:ring-2 focus:ring-offset-2",
  
  // Primary button (filled)
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  
  // Secondary button (outlined)
  secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
  
  // Text button (no background)
  text: "text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
  
  // Icon button
  icon: "p-2 text-gray-500 hover:bg-gray-100 rounded-full focus:ring-blue-500",
  
  // Sizes
  sm: "px-3 py-1.5 text-sm rounded-full",
  md: "px-4 py-2 text-sm rounded-full",
  lg: "px-6 py-3 text-base rounded-full",
  
  // Danger variant
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  
  // Success variant
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
};

export const inputStyles = {
  base: "block w-full transition-colors duration-200 font-roboto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  
  // Text input
  input: "border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm text-gray-900 placeholder-gray-400",
  
  // Select input
  select: "border border-gray-300 rounded-lg shadow-sm py-2 pl-3 pr-10 text-sm text-gray-900",
  
  // Search input
  search: "pl-10 pr-3 py-2 border border-gray-300 rounded-full text-sm placeholder-gray-400",
};

export const cardStyles = {
  base: "bg-white rounded-lg shadow-sm overflow-hidden",
  
  // Card header
  header: "px-6 py-4 border-b border-gray-200",
  
  // Card body
  body: "px-6 py-4",
  
  // Card footer
  footer: "px-6 py-4 bg-gray-50 border-t border-gray-200",
};

export const typographyStyles = {
  // Headings use Google Sans
  h1: "text-2xl font-medium google-sans text-gray-900",
  h2: "text-xl font-medium google-sans text-gray-900",
  h3: "text-lg font-medium google-sans text-gray-900",
  
  // Body text uses Roboto
  body: "text-sm font-roboto text-gray-500",
  bodyLarge: "text-base font-roboto text-gray-500",
  
  // Labels and captions
  label: "block text-sm font-medium text-gray-700 mb-1",
  caption: "text-xs font-roboto text-gray-400",
};

export const listStyles = {
  base: "divide-y divide-gray-200",
  item: "px-6 py-4 hover:bg-gray-50 transition-colors duration-200",
  itemSelected: "px-6 py-4 bg-blue-50",
};

export const chipStyles = {
  base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  
  // Status variants
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};
