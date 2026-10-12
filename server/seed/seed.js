// Demo data loader. Run from the server folder:  npm run seed
// WARNING: wipes cities, attractions, parking, bookings, payments and favorites, then re-creates demo data.
// All parking records are DEMONSTRATION data (verified:false). Replace them with real, verified data via the admin panel.
//
// Cities/states are fetched from a public India cities API at seed time
// (https://github.com/nshntarora/Indian-Cities-JSON). If the network is unavailable,
// a small built-in list is used instead so seeding never fails.
const env = require('../config/env');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const City = require('../models/City');
const Attraction = require('../models/Attraction');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Favorite = require('../models/Favorite');
const { slugify } = require('../utils/time');

const img = (seed) => `https://picsum.photos/seed/${seed}/900/600`; // placeholder photos - replace in admin panel

// Fees are intentionally low: a small Rs.5 convenience fee and 5% GST.
const CONVENIENCE_FEE = 5;
const TAX_PERCENT = 5;

const CITIES_API = 'https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json';

// Approximate state/UT coordinates (used to place DEMO parking when the API has no lat/lng).
const STATE_COORDS = {
  'Andaman and Nicobar Islands': [11.7401, 92.6586],
  'Andhra Pradesh': [15.9129, 79.7400],
  'Arunachal Pradesh': [27.0844, 93.6053],
  'Assam': [26.1445, 91.7362],
  'Bihar': [25.5941, 85.1376],
  'Chandigarh': [30.7333, 76.7794],
  'Chhattisgarh': [21.2514, 81.6296],
  'Dadra and Nagar Haveli': [20.2730, 73.0030],
  'Daman and Diu': [20.4283, 72.8397],
  'Delhi': [28.6139, 77.2090],
  'Goa': [15.4909, 73.8278],
  'Gujarat': [23.0225, 72.5714],
  'Haryana': [29.0588, 76.0856],
  'Himachal Pradesh': [31.1048, 77.1734],
  'Jammu and Kashmir': [34.0837, 74.7973],
  'Jharkhand': [23.3441, 85.3096],
  'Karnataka': [12.9716, 77.5946],
  'Kerala': [8.5241, 76.9366],
  'Madhya Pradesh': [23.2599, 77.4126],
  'Maharashtra': [19.0760, 72.8777],
  'Manipur': [24.8170, 93.9368],
  'Meghalaya': [25.5788, 91.8933],
  'Mizoram': [23.7271, 92.7176],
  'Nagaland': [25.6751, 94.1086],
  'Odisha': [20.2961, 85.8245],
  'Puducherry': [11.9416, 79.8083],
  'Punjab': [30.9010, 75.8573],
  'Rajasthan': [26.9124, 75.7873],
  'Sikkim': [27.3389, 88.6065],
  'Tamil Nadu': [13.0827, 80.2707],
  'Telangana': [17.3850, 78.4867],
  'Tripura': [23.8315, 91.2868],
  'Uttar Pradesh': [26.8467, 80.9462],
  'Uttarakhand': [30.3165, 78.0322],
  'West Bengal': [22.5726, 88.3639],
  'Ladakh': [34.1526, 77.5771],
  'Lakshadweep': [10.5669, 72.6420],
};
const DEFAULT_COORDS = [22.9734, 78.6569];

// Built-in fallback so EVERY state/UT is represented even if the API is unreachable.
// It is always merged with the fetched list (duplicates are removed later).
const FALLBACK_CITIES = [
  ['Andhra Pradesh', ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore']],
  ['Arunachal Pradesh', ['Itanagar', 'Tawang', 'Naharlagun', 'Pasighat']],
  ['Assam', ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur']],
  ['Bihar', ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga']],
  ['Chhattisgarh', ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Naya Raipur']],
  ['Goa', ['Panaji', 'Margao', 'Vasco da Gama', 'Calangute', 'Ponda']],
  ['Gujarat', ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar']],
  ['Haryana', ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal']],
  ['Himachal Pradesh', ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Kullu']],
  ['Jharkhand', ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar']],
  ['Karnataka', ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi']],
  ['Kerala', ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Alappuzha']],
  ['Madhya Pradesh', ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain']],
  ['Maharashtra', ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane']],
  ['Manipur', ['Imphal', 'Thoubal', 'Bishnupur']],
  ['Meghalaya', ['Shillong', 'Tura', 'Cherrapunji']],
  ['Mizoram', ['Aizawl', 'Lunglei', 'Champhai']],
  ['Nagaland', ['Kohima', 'Dimapur', 'Mokokchung']],
  ['Odisha', ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur']],
  ['Punjab', ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Mohali']],
  ['Rajasthan', ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer']],
  ['Sikkim', ['Gangtok', 'Namchi', 'Gyalshing']],
  ['Tamil Nadu', ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem']],
  ['Telangana', ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar']],
  ['Tripura', ['Agartala', 'Dharmanagar', 'Udaipur']],
  ['Uttar Pradesh', ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Noida', 'Prayagraj']],
  ['Uttarakhand', ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital']],
  ['West Bengal', ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri', 'Durgapur']],
  ['Delhi', ['New Delhi', 'Delhi']],
  ['Jammu and Kashmir', ['Srinagar', 'Jammu', 'Gulmarg', 'Anantnag']],
  ['Ladakh', ['Leh', 'Kargil']],
  ['Chandigarh', ['Chandigarh']],
  ['Puducherry', ['Puducherry', 'Karaikal']],
  ['Andaman and Nicobar Islands', ['Port Blair', 'Havelock Island']],
  ['Daman and Diu', ['Daman', 'Diu']],
  ['Dadra and Nagar Haveli', ['Silvassa']],
  ['Lakshadweep', ['Kavaratti', 'Agatti']],
].flatMap(([state, names]) => names.map((name) => ({ name, state })));

// Some source rows have spelling variants - normalise them to the official name.
const STATE_ALIASES = {
  'Himachal Praddesh': 'Himachal Pradesh',
  'Pondicherry': 'Puducherry',
  'Orissa': 'Odisha',
  'Uttaranchal': 'Uttarakhand',
};
const fixState = (s) => STATE_ALIASES[s] || s;

// ---- Curated tourist cities: these get rich, hand-written attractions + more parking ----
const DATA = [
  {
    name: 'Indore', state: 'Madhya Pradesh', featured: true,
    description: 'The food and commerce capital of Madhya Pradesh, known for Rajwada, street food and clean streets.',
    attractions: [
      { name: 'C21 Mall', category: 'Mall', lat: 22.7516, lng: 75.8937, address: 'AB Road, Vijay Nagar, Indore', short: 'Large shopping and entertainment mall in Vijay Nagar.', pop: 95, featured: true },
      { name: 'Rajwada Palace', category: 'Heritage', lat: 22.7185, lng: 75.8553, address: 'Rajwada, Old City, Indore', short: 'Historic seven-storey Holkar palace in the heart of the old city.', pop: 90, featured: true },
      { name: 'Lal Bagh Palace', category: 'Heritage', lat: 22.7003, lng: 75.8432, address: 'Lal Bagh Road, Indore', short: 'Grand Holkar-era palace museum with landscaped grounds.', pop: 70 },
      { name: 'Meghdoot Garden', category: 'Park', lat: 22.7498, lng: 75.8917, address: 'Vijay Nagar, Indore', short: 'Popular family garden with walking paths and play areas.', pop: 60 },
    ],
  },
  {
    name: 'Bhopal', state: 'Madhya Pradesh', featured: true,
    description: 'The City of Lakes, blending old-world heritage with green spaces and museums.',
    attractions: [
      { name: 'Upper Lake', category: 'Nature', lat: 23.2530, lng: 77.3350, address: 'Upper Lake, Bhopal', short: 'Iconic lake with boating, promenades and sunset views.', pop: 92, featured: true },
      { name: 'Van Vihar National Park', category: 'Nature', lat: 23.2325, lng: 77.3977, address: 'Van Vihar, Bhopal', short: 'Zoo and national park on the banks of the Upper Lake.', pop: 80 },
      { name: 'Taj-ul-Masajid', category: 'Heritage', lat: 23.2623, lng: 77.3947, address: 'Old City, Bhopal', short: 'One of the largest mosques in India, known for its pink facade.', pop: 65 },
      { name: 'Bharat Bhavan', category: 'Museum', lat: 23.2547, lng: 77.3390, address: 'Shamla Hills, Bhopal', short: 'Multi-arts complex overlooking the Upper Lake.', pop: 55 },
    ],
  },
  {
    name: 'Ujjain', state: 'Madhya Pradesh', featured: true,
    description: 'One of the seven sacred cities of India, home to the Mahakaleshwar Jyotirlinga.',
    attractions: [
      { name: 'Mahakaleshwar Temple', category: 'Temple', lat: 23.1828, lng: 75.7683, address: 'Jaisinghpura, Ujjain', short: 'Revered Jyotirlinga temple on the Rudrasagar lake.', pop: 98, featured: true },
      { name: 'Ram Ghat', category: 'Heritage', lat: 23.1792, lng: 75.7686, address: 'Shipra River, Ujjain', short: 'Main bathing ghat on the Shipra, famous for evening aarti.', pop: 75 },
      { name: 'Kal Bhairav Temple', category: 'Temple', lat: 23.2000, lng: 75.7788, address: 'Bhairavgarh, Ujjain', short: 'Ancient temple dedicated to Kal Bhairav.', pop: 60 },
    ],
  },
  {
    name: 'Jaipur', state: 'Rajasthan', featured: true,
    description: 'The Pink City: forts, palaces and bazaars of Rajasthan.',
    attractions: [
      { name: 'Hawa Mahal', category: 'Heritage', lat: 26.9239, lng: 75.8267, address: 'Badi Choupad, Jaipur', short: 'The Palace of Winds with its honeycomb pink facade.', pop: 97, featured: true },
      { name: 'City Palace', category: 'Museum', lat: 26.9258, lng: 75.8237, address: 'Tripolia Bazaar, Jaipur', short: 'Royal residence and museum in the old city.', pop: 88 },
      { name: 'Amer Fort', category: 'Heritage', lat: 26.9855, lng: 75.8513, address: 'Amer, Jaipur', short: 'Hilltop hill-fort with courtyards and mirror work.', pop: 93 },
      { name: 'Jantar Mantar', category: 'Museum', lat: 26.9247, lng: 75.8246, address: 'Gangori Bazaar, Jaipur', short: 'UNESCO-listed astronomical observatory.', pop: 70 },
    ],
  },
  {
    name: 'New Delhi', state: 'Delhi', featured: true,
    description: 'The national capital, home to grand monuments, museums and tree-lined boulevards.',
    attractions: [
      { name: 'India Gate', category: 'Heritage', lat: 28.6129, lng: 77.2295, address: 'Rajpath, New Delhi', short: 'War memorial arch at the heart of the capital.', pop: 96, featured: true },
      { name: 'Red Fort', category: 'Heritage', lat: 28.6562, lng: 77.2410, address: 'Netaji Subhash Marg, Old Delhi', short: 'Mughal fort complex and UNESCO World Heritage Site.', pop: 94, featured: true },
      { name: 'Qutub Minar', category: 'Heritage', lat: 28.5245, lng: 77.1855, address: 'Mehrauli, New Delhi', short: "The world's tallest brick minaret, built in the 13th century.", pop: 89 },
      { name: 'Lotus Temple', category: 'Temple', lat: 28.5535, lng: 77.2588, address: 'Kalkaji, New Delhi', short: 'Bahai House of Worship shaped like a blooming lotus.', pop: 85 },
    ],
  },
  {
    name: 'Mumbai', state: 'Maharashtra', featured: true,
    description: 'The city of dreams on the Arabian Sea, famous for heritage, beaches and Bollywood.',
    attractions: [
      { name: 'Gateway of India', category: 'Heritage', lat: 18.9220, lng: 72.8347, address: 'Apollo Bunder, Colaba, Mumbai', short: 'Iconic arch overlooking the Mumbai harbour.', pop: 97, featured: true },
      { name: 'Marine Drive', category: 'Nature', lat: 18.9432, lng: 72.8234, address: 'Netaji Subhash Chandra Bose Road, Mumbai', short: "The Queen's Necklace promenade along the sea.", pop: 92 },
      { name: 'Elephanta Caves', category: 'Heritage', lat: 18.9633, lng: 72.9315, address: 'Gharapuri Island, Mumbai', short: 'Rock-cut cave temples on an island in the harbour.', pop: 80 },
      { name: 'Siddhivinayak Temple', category: 'Temple', lat: 19.0169, lng: 72.8302, address: 'Prabhadevi, Mumbai', short: 'Famous Ganesha temple visited by millions.', pop: 90 },
    ],
  },
  {
    name: 'Agra', state: 'Uttar Pradesh', featured: true,
    description: 'Home of the Taj Mahal and a wealth of Mughal-era architecture.',
    attractions: [
      { name: 'Taj Mahal', category: 'Heritage', lat: 27.1751, lng: 78.0421, address: 'Dharmapuri, Forest Colony, Agra', short: 'The white-marble mausoleum and wonder of the world.', pop: 99, featured: true },
      { name: 'Agra Fort', category: 'Heritage', lat: 27.1795, lng: 78.0211, address: 'Rakabganj, Agra', short: 'Massive red-sandstone fort and UNESCO World Heritage Site.', pop: 88 },
      { name: 'Fatehpur Sikri', category: 'Heritage', lat: 27.0937, lng: 77.6679, address: 'Fatehpur Sikri, Agra', short: 'Abandoned Mughal capital city of red sandstone.', pop: 78 },
      { name: 'Mehtab Bagh', category: 'Park', lat: 27.1799, lng: 78.0433, address: 'Near Taj Mahal, Agra', short: 'Riverside garden with the best sunset views of the Taj.', pop: 65 },
    ],
  },
  {
    name: 'Varanasi', state: 'Uttar Pradesh', featured: false,
    description: 'The spiritual capital of India on the banks of the Ganga.',
    attractions: [
      { name: 'Kashi Vishwanath Temple', category: 'Temple', lat: 25.3109, lng: 83.0107, address: 'Lahori Tola, Varanasi', short: 'One of the twelve Jyotirlingas on the Ganga ghats.', pop: 97, featured: true },
      { name: 'Dashashwamedh Ghat', category: 'Heritage', lat: 25.3069, lng: 83.0105, address: 'Ghats of Ganga, Varanasi', short: 'Main ghat famous for the evening Ganga aarti.', pop: 90 },
      { name: 'Sarnath', category: 'Heritage', lat: 25.3799, lng: 83.0245, address: 'Sarnath, Varanasi', short: 'Where Buddha gave his first sermon; stupa and museum.', pop: 72 },
    ],
  },
  {
    name: 'Panaji', state: 'Goa', featured: true,
    description: 'Beaches, Portuguese heritage and relaxed coastal charm.',
    attractions: [
      { name: 'Baga Beach', category: 'Nature', lat: 15.5553, lng: 73.7517, address: 'Baga, North Goa', short: 'Lively beach known for water sports and nightlife.', pop: 94, featured: true },
      { name: 'Basilica of Bom Jesus', category: 'Heritage', lat: 15.5009, lng: 73.9116, address: 'Old Goa, Panaji', short: 'UNESCO baroque church holding the relics of St Francis Xavier.', pop: 86 },
      { name: 'Fort Aguada', category: 'Heritage', lat: 15.4926, lng: 73.7736, address: 'Sinquerim, North Goa', short: '17th-century Portuguese fort and lighthouse by the sea.', pop: 80 },
      { name: 'Calangute Beach', category: 'Nature', lat: 15.5439, lng: 73.7553, address: 'Calangute, North Goa', short: "The 'Queen of Beaches' on the north Goa coast.", pop: 88 },
    ],
  },
  {
    name: 'Bengaluru', state: 'Karnataka', featured: true,
    description: 'The Garden City, a hub of gardens, palaces and technology.',
    attractions: [
      { name: 'Lalbagh Botanical Garden', category: 'Park', lat: 12.9507, lng: 77.5848, address: 'Mavalli, Bengaluru', short: 'Historic botanical garden with a glasshouse.', pop: 88, featured: true },
      { name: 'Bangalore Palace', category: 'Museum', lat: 12.9987, lng: 77.5921, address: 'Vasanth Nagar, Bengaluru', short: 'Tudor-style royal palace with woodwork interiors.', pop: 82 },
      { name: 'Cubbon Park', category: 'Park', lat: 12.9763, lng: 77.5929, address: 'Sampangi Rama Nagar, Bengaluru', short: 'Sprawling green lung in the heart of the city.', pop: 75 },
      { name: 'ISKCON Temple', category: 'Temple', lat: 13.0098, lng: 77.5510, address: 'Rajajinagar, Bengaluru', short: 'Hilltop Krishna temple complex with cultural centre.', pop: 85 },
    ],
  },
  {
    name: 'Mysuru', state: 'Karnataka', featured: false,
    description: 'The cultural capital of Karnataka, famous for its royal palace.',
    attractions: [
      { name: 'Mysore Palace', category: 'Heritage', lat: 12.3052, lng: 76.6552, address: 'Sayyaji Rao Road, Mysuru', short: 'Opulent royal palace lit by thousands of bulbs at night.', pop: 96, featured: true },
      { name: 'Chamundi Hills', category: 'Temple', lat: 12.2724, lng: 76.6705, address: 'Chamundi Hill, Mysuru', short: 'Hilltop temple with panoramic views of the city.', pop: 78 },
      { name: 'Brindavan Gardens', category: 'Park', lat: 12.4209, lng: 76.5730, address: 'KRS Dam, Mysuru', short: 'Terraced musical-fountain gardens beside the dam.', pop: 74 },
    ],
  },
  {
    name: 'Hyderabad', state: 'Telangana', featured: true,
    description: 'The City of Pearls, blending Nizam heritage with modern tech.',
    attractions: [
      { name: 'Charminar', category: 'Heritage', lat: 17.3616, lng: 78.4747, address: 'Charminar Road, Hyderabad', short: 'Iconic 16th-century mosque and monument.', pop: 95, featured: true },
      { name: 'Golconda Fort', category: 'Heritage', lat: 17.3833, lng: 78.4011, address: 'Ibrahim Bagh, Hyderabad', short: 'Hilltop fort renowned for acoustics and diamond trade.', pop: 87 },
      { name: 'Hussain Sagar Lake', category: 'Nature', lat: 17.4239, lng: 78.4738, address: 'Tank Bund Road, Hyderabad', short: 'Heart-shaped lake with a monolithic Buddha statue.', pop: 83 },
      { name: 'Ramoji Film City', category: 'Other', lat: 17.2543, lng: 78.6808, address: 'Abdullapurmet, Hyderabad', short: "The world's largest film studio complex.", pop: 79 },
    ],
  },
  {
    name: 'Amritsar', state: 'Punjab', featured: true,
    description: 'The spiritual home of Sikhism and a city of rich food and history.',
    attractions: [
      { name: 'Golden Temple', category: 'Temple', lat: 31.6200, lng: 74.8765, address: 'Harmandir Sahib, Amritsar', short: 'The holiest gurdwara, glowing gold above the Amrit Sarovar.', pop: 99, featured: true },
      { name: 'Jallianwala Bagh', category: 'Heritage', lat: 31.6205, lng: 74.8800, address: 'Golden Temple Road, Amritsar', short: 'Memorial garden commemorating the 1919 massacre.', pop: 84 },
      { name: 'Wagah Border', category: 'Other', lat: 31.6047, lng: 74.5731, address: 'Attari, Amritsar', short: 'Indo-Pak border with the famous daily beating retreat.', pop: 88 },
    ],
  },
  {
    name: 'Udaipur', state: 'Rajasthan', featured: true,
    description: 'The City of Lakes, romantic palaces and shimmering waters.',
    attractions: [
      { name: 'City Palace', category: 'Heritage', lat: 24.5764, lng: 73.6835, address: 'Old City, Udaipur', short: 'Sprawling palace complex overlooking Lake Pichola.', pop: 93, featured: true },
      { name: 'Lake Pichola', category: 'Nature', lat: 24.5720, lng: 73.6800, address: 'Pichola, Udaipur', short: 'Artificial lake with island palaces and boat rides.', pop: 90 },
      { name: 'Jag Mandir', category: 'Heritage', lat: 24.5685, lng: 73.6790, address: 'Pichola Island, Udaipur', short: 'Island palace in the middle of Lake Pichola.', pop: 76 },
    ],
  },
  {
    name: 'Jodhpur', state: 'Rajasthan', featured: false,
    description: 'The Blue City, dominated by the mighty Mehrangarh Fort.',
    attractions: [
      { name: 'Mehrangarh Fort', category: 'Heritage', lat: 26.2978, lng: 73.0184, address: 'Fort Road, Jodhpur', short: 'Towering fort with palaces, museums and city views.', pop: 94, featured: true },
      { name: 'Umaid Bhawan Palace', category: 'Museum', lat: 26.2930, lng: 73.0470, address: 'Circuit House Road, Jodhpur', short: 'Grand art-deco palace, partly a museum and hotel.', pop: 80 },
      { name: 'Jaswant Thada', category: 'Heritage', lat: 26.2906, lng: 73.0229, address: 'Near Mehrangarh, Jodhpur', short: 'White-marble cenotaph with serene gardens.', pop: 68 },
    ],
  },
  {
    name: 'Shimla', state: 'Himachal Pradesh', featured: false,
    description: 'The queen of hill stations, with colonial charm and mountain views.',
    attractions: [
      { name: 'The Ridge', category: 'Nature', lat: 31.1042, lng: 77.1730, address: 'The Ridge, Shimla', short: 'Open promenade in the heart of town with mountain views.', pop: 87, featured: true },
      { name: 'Jakhoo Temple', category: 'Temple', lat: 31.1013, lng: 77.1847, address: 'Jakhoo Hill, Shimla', short: 'Hilltop Hanuman temple with a giant statue.', pop: 79 },
      { name: 'Mall Road', category: 'Market', lat: 31.1033, lng: 77.1729, address: 'Mall Road, Shimla', short: 'Bustling pedestrian street of shops and cafes.', pop: 85 },
    ],
  },
  {
    name: 'Kochi', state: 'Kerala', featured: true,
    description: 'The Queen of the Arabian Sea, a blend of colonial history and backwaters.',
    attractions: [
      { name: 'Fort Kochi Beach', category: 'Nature', lat: 9.9650, lng: 76.2422, address: 'Fort Kochi, Kochi', short: 'Historic seaside promenade with colonial lanes.', pop: 86, featured: true },
      { name: 'Chinese Fishing Nets', category: 'Heritage', lat: 9.9680, lng: 76.2400, address: 'Fort Kochi, Kochi', short: 'Iconic cantilevered fishing nets at sunset.', pop: 82 },
      { name: 'Mattancherry Palace', category: 'Museum', lat: 9.9585, lng: 76.2593, address: 'Mattancherry, Kochi', short: 'Portuguese palace with murals, also called the Dutch Palace.', pop: 70 },
    ],
  },
  {
    name: 'Pune', state: 'Maharashtra', featured: false,
    description: 'The Oxford of the East, with Maratha history and a lively food scene.',
    attractions: [
      { name: 'Shaniwar Wada', category: 'Heritage', lat: 18.5195, lng: 73.8553, address: 'Shaniwar Peth, Pune', short: 'Historic Peshwa fortification and palace ruins.', pop: 84, featured: true },
      { name: 'Aga Khan Palace', category: 'Museum', lat: 18.5522, lng: 73.9063, address: 'Nagar Road, Pune', short: 'Elegant palace and Gandhi memorial with gardens.', pop: 76 },
      { name: 'Sinhagad Fort', category: 'Heritage', lat: 18.3663, lng: 73.7555, address: 'Sinhagad, Pune', short: 'Hill fort with trekking routes and valley views.', pop: 78 },
    ],
  },
  {
    name: 'Chennai', state: 'Tamil Nadu', featured: false,
    description: 'A coastal metro of temples, beaches and Dravidian culture.',
    attractions: [
      { name: 'Marina Beach', category: 'Nature', lat: 13.0500, lng: 80.2824, address: 'Marina Beach Road, Chennai', short: 'One of the longest urban beaches in the world.', pop: 90, featured: true },
      { name: 'Kapaleeshwarar Temple', category: 'Temple', lat: 13.0339, lng: 80.2699, address: 'Mylapore, Chennai', short: 'Colourful Dravidian temple with a towering gopuram.', pop: 82 },
      { name: 'Fort St. George', category: 'Heritage', lat: 13.0797, lng: 80.2870, address: 'Rajaji Salai, Chennai', short: 'First English fortress in India, now a museum.', pop: 68 },
    ],
  },
  {
    name: 'Ahmedabad', state: 'Gujarat', featured: false,
    description: "India's first UNESCO World Heritage city, rich in stepwells and history.",
    attractions: [
      { name: 'Sabarmati Ashram', category: 'Heritage', lat: 23.0608, lng: 72.5808, address: 'Gandhi Smarak Sangrahalaya, Ahmedabad', short: "Gandhi's former home and museum on the Sabarmati river.", pop: 85, featured: true },
      { name: 'Kankaria Lake', category: 'Nature', lat: 22.9995, lng: 72.6017, address: 'Kankaria, Ahmedabad', short: 'Circular lake with a zoo, toy train and promenade.', pop: 80 },
      { name: 'Sidi Saiyyed Mosque', category: 'Heritage', lat: 23.0300, lng: 72.5872, address: 'Lal Darwaja, Ahmedabad', short: '15th-century mosque famous for its filigree stone windows.', pop: 72 },
    ],
  },
];

// Fetch all Indian cities from the public dataset. Falls back gracefully.
async function fetchAllCities() {
  try {
    const res = await fetch(CITIES_API, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    const out = [];
    for (const r of rows) {
      const name = String(r.name || '').trim();
      const state = fixState(String(r.state || '').trim());
      if (name && state) out.push({ name, state });
    }
    return out;
  } catch (e) {
    console.warn(`\n[seed] Could not fetch the cities API (${e.message}). Using the built-in tourist list only.`);
    return [];
  }
}

// ---------- Relevant images from Wikipedia (batched + rate-limit friendly) ----------
const WIKI_UA = 'ParkWise-Demo-Seed/1.0 (demo project; contact: demo@example.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': WIKI_UA, accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (res.status === 429) { await sleep(1500 * (i + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { lastErr = e; await sleep(900 * (i + 1)); }
  }
  throw lastErr;
}

const stripQuery = (u) => (u ? String(u).split('?')[0] : null);

// Fetches the lead image for many article titles in batches of 40 (Wikipedia caps at 50).
// Returns a Map<title, url|null>. Follows redirects/normalisation so "Rajwada" etc. resolve.
async function wikiImages(titles, width = 1200) {
  const wanted = [...new Set(titles.filter(Boolean).map((t) => String(t).trim()).filter(Boolean))];
  const map = new Map();
  for (let i = 0; i < wanted.length; i += 40) {
    const batch = wanted.slice(i, i + 40);
    const titlesParam = batch.map(encodeURIComponent).join('|');
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=${width}&titles=${titlesParam}`;
    try {
      const d = await fetchJson(url);
      const remap = {};
      (d.query?.normalized || []).forEach((n) => { remap[n.from] = n.to; });
      (d.query?.redirects || []).forEach((r) => { remap[r.from] = r.to; });
      const byTitle = {};
      Object.values(d.query?.pages || {}).forEach((p) => { if (p.thumbnail?.source) byTitle[p.title] = stripQuery(p.thumbnail.source); });
      for (const req of batch) {
        let t = req; let guard = 0;
        while (remap[t] && guard++ < 6) t = remap[t];
        map.set(req, byTitle[t] || null);
      }
    } catch (e) {
      console.warn(`[seed] Wikipedia image batch failed (${e.message}); using fallbacks.`);
      batch.forEach((t) => map.set(t, null));
    }
    await sleep(150);
  }
  return map;
}

// Attraction name -> Wikipedia article title (only needed when the plain name is ambiguous).
const WIKI_ATTRACTION = {
  'City Palace': (c) => `City Palace, ${c.name}`,
  'Upper Lake': 'Upper Lake, Bhopal',
  'The Ridge': 'The Ridge, Shimla',
  'Marine Drive': 'Marine Drive, Mumbai',
  'Wagah Border': 'Wagah',
  'Kal Bhairav Temple': 'Kal Bhairav Temple, Ujjain',
  'Jantar Mantar': 'Jantar Mantar, Jaipur',
  'Siddhivinayak Temple': 'Siddhivinayak Temple, Mumbai',
  'Baga Beach': 'Baga, Goa',
  'Calangute Beach': 'Calangute',
  'Lalbagh Botanical Garden': 'Lalbagh',
  'ISKCON Temple': 'ISKCON Temple Bangalore',
  'Chamundi Hills': 'Chamundeshwari Temple',
  'Golconda Fort': 'Golconda',
  'Hussain Sagar Lake': 'Hussain Sagar',
  'Sinhagad Fort': 'Sinhagad',
  'Fort St. George': 'Fort St. George, India',
  'Mahakaleshwar Temple': 'Mahakaleshwar Jyotirlinga',
  'Chinese Fishing Nets': 'Chinese fishing nets',
  'Fort Kochi Beach': 'Fort Kochi',
  'Mehrangarh Fort': 'Mehrangarh',
  'Ram Ghat': 'Ram Ghat',
  'Mall Road': 'Mall Road, Shimla',
};
function wikiTitleForAttraction(a, c) {
  const v = WIKI_ATTRACTION[a.name];
  return typeof v === 'function' ? v(c) : (v || a.name);
}

// Lead Wikipedia page used when a place has no image of its own.
const CATEGORY_WIKI = {
  Temple: 'Hindu temple',
  Heritage: 'Agra Fort',
  Nature: 'Beach',
  Park: 'Urban park',
  Museum: 'Museum',
  Market: 'Marketplace',
  Mall: 'Shopping mall',
  Other: 'India Gate',
};
const CATEGORY_WIKI_PAGES = [...new Set([...Object.values(CATEGORY_WIKI), 'Tourism in India'])];

// Wikipedia titles that resolve better than the raw city name.
const CITY_IMAGE_OVERRIDES = {
  Puducherry: 'Pondicherry',
  'KathUrban Agglomeration': 'Kathua',
};

// Resolves a lead image for each city. Many Indian town names are disambiguation pages,
// so a second pass with "Name, State" is used for anything the plain name missed.
async function cityImages(items, width = 1200) {
  const out = new Map(); // key -> url
  const pass1 = await wikiImages(items.map((i) => i.name), width);
  items.forEach((i) => { const u = pass1.get(i.name); if (u) out.set(i.key, u); });
  const left = items.filter((i) => !out.has(i.key));
  if (left.length) {
    const titles = left.map((i) => `${i.name}, ${i.state}`);
    const pass2 = await wikiImages(titles, width);
    left.forEach((i, idx) => { const u = pass2.get(titles[idx]); if (u) out.set(i.key, u); });
  }
  return out;
}

// Wikipedia search -> lead image (for names that are not exact article titles).
async function wikiSearchImage(query, width = 1200) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=${width}`;
  try {
    const d = await fetchJson(url);
    const p = Object.values(d.query?.pages || {})[0];
    return p?.thumbnail?.source ? stripQuery(p.thumbnail.source) : null;
  } catch { return null; }
}

// Wikimedia Commons file search -> first matching file image (covers places with no article image).
async function wikiCommonsImage(query, width = 1000) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=${width}`;
  try {
    const d = await fetchJson(url);
    const p = Object.values(d.query?.pages || {})[0];
    return p?.imageinfo?.[0]?.thumburl ? stripQuery(p.imageinfo[0].thumburl) : null;
  } catch { return null; }
}

// Resolves a DISTINCT, relevant image per attraction (so places in one city do not share a photo).
// items: [{ key, name, cityName, category, resolved }]
async function attractionImages(items, width = 1200) {
  const out = new Map(); // key -> url
  const primary = items.map((i) => i.resolved || i.name);
  const pass1 = await wikiImages(primary, width);
  items.forEach((i, idx) => { const u = pass1.get(primary[idx]); if (u) out.set(i.key, u); });

  let left = items.filter((i) => !out.has(i.key));
  if (left.length) {
    const titles = left.map((i) => `${i.name}, ${i.cityName}`);
    const pass2 = await wikiImages(titles, width);
    left.forEach((i, idx) => { const u = pass2.get(titles[idx]); if (u) out.set(i.key, u); });
  }

  left = items.filter((i) => !out.has(i.key));
  for (const i of left) {
    const u = (await wikiSearchImage(`${i.name} ${i.cityName} India`, width)) || (await wikiCommonsImage(`${i.name} ${i.cityName}`, 1000));
    if (u) out.set(i.key, u);
    await sleep(120);
  }
  return out;
}

async function main() {
  if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to seed in production without --force');
    process.exit(1);
  }
  await connectDB();

  await Promise.all([City, Attraction, ParkingLocation, ParkingArea, ParkingSlot, Booking, Payment, Favorite].map((M) => M.deleteMany({})));
  await ParkingSlot.syncIndexes();

  // ----- users (created ONLY here, never through a public endpoint) -----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@parkwise.local').toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@12345';
  if (!(await User.findOne({ email: adminEmail }))) await User.create({ name: 'ParkWise Admin', email: adminEmail, password: adminPass, role: 'admin' });
  if (env.nodeEnv !== 'production' && !(await User.findOne({ email: 'user@parkwise.local' }))) {
    await User.create({ name: 'Demo User', email: 'user@parkwise.local', password: 'User@12345', role: 'user' });
  }

  // ----- build the full city list (curated + API) -----
  const curated = new Set(DATA.map((c) => slugify(c.name)));
  const cityDocs = [];
  const seen = new Set();
  const seenKey = new Set(); // slugify(name)|state - prevents fallback/API duplicates

  for (const c of DATA) {
    const slug = slugify(c.name);
    seen.add(slug);
    seenKey.add(`${slug}|${c.state}`);
    cityDocs.push({ name: c.name, slug, state: c.state, description: c.description, image: img(`pw-city-${slug}`), featured: c.featured });
  }

  const apiCities = [...FALLBACK_CITIES, ...(await fetchAllCities())];
  for (const c of apiCities) {
    const key = `${slugify(c.name)}|${c.state}`;
    if (seenKey.has(key)) continue; // same city (and state) already added
    let slug = slugify(c.name);
    if (seen.has(slug)) slug = slugify(`${c.name}-${c.state}`);
    if (seen.has(slug)) continue;
    seen.add(slug);
    seenKey.add(key);
    cityDocs.push({
      name: c.name, slug, state: c.state,
      description: `${c.name} is a city in ${c.state}, India. Explore nearby attractions and reserve parking before you arrive.`,
      image: img(`pw-city-${slug}`), featured: false,
    });
  }

// ----- relevant images for every city + curated attraction (batched from Wikipedia) -----
  console.log('[seed] Fetching city images from Wikipedia...');
  const cityImg = await cityImages(cityDocs.map((c) => ({ name: CITY_IMAGE_OVERRIDES[c.name] || c.name, state: c.state, key: c.slug })), 1200);
  const stateImg = await wikiImages([...new Set(cityDocs.map((c) => c.state))], 1200);
  const fallbackImgs = await wikiImages(CATEGORY_WIKI_PAGES, 1200);
  const genericFallback = fallbackImgs.get('India Gate') || fallbackImgs.get('Tourism in India') || null;
  const categoryImage = (cat) => fallbackImgs.get(CATEGORY_WIKI[cat]) || genericFallback;
  for (const c of cityDocs) c.image = cityImg.get(c.slug) || stateImg.get(c.state) || categoryImage('Other') || img(`pw-city-${c.slug}`);

  console.log('[seed] Fetching attraction images from Wikipedia...');
  const attrItems = [];
  for (const c of DATA) for (const a of c.attractions) {
    attrItems.push({
      key: `${c.name}||${a.name}`, name: a.name, cityName: c.name, category: a.category,
      resolved: WIKI_ATTRACTION[a.name] ? wikiTitleForAttraction(a, c) : null,
    });
  }
  const attrResolvedImg = await attractionImages(attrItems, 1200);

  // Insert cities in chunks and map slug -> _id.
  const cityIdBySlug = new Map();
  for (let i = 0; i < cityDocs.length; i += 500) {
    const created = await City.insertMany(cityDocs.slice(i, i + 500), { ordered: false });
    for (const doc of created) cityIdBySlug.set(doc.slug, doc._id);
  }

  let nLoc = 0; let nSlots = 0;

  // ----- curated cities: rich attractions + several parking locations -----
  for (const c of DATA) {
    const cityId = cityIdBySlug.get(slugify(c.name));
    for (const a of c.attractions) {
      const attrKey = `${c.name}||${a.name}`;
      const attractionImage = attrResolvedImg.get(attrKey) || categoryImage(a.category) || cityImg.get(slugify(c.name)) || stateImg.get(c.state) || img(`pw-${slugify(a.name)}`);
      const attraction = await Attraction.create({
        name: a.name, slug: slugify(`${a.name}-${c.name}`), city: cityId, category: a.category, shortDescription: a.short,
        description: `${a.short} (Sample description - replace with accurate details. Coordinates are approximate.)`,
        address: a.address, location: { lat: a.lat, lng: a.lng }, images: [attractionImage],
        openingHours: 'Not verified', hoursVerified: false, featured: !!a.featured, popularity: a.pop,
      });
      const specs = [
        { name: `(Demo) ${a.name} Main Parking`, type: 'on-site', dLat: 0.0006, dLng: 0.0004, rate: { car: 40, bike: 15, other: 60 }, areas: [['Basement Parking', 'B', 30, ['car', 'other']], ['Outdoor Parking', 'O', 22, ['car']], ['Two-Wheeler Zone', 'T', 12, ['bike']]], featured: !!a.featured, is24x7: false },
        { name: `(Demo) Public Parking near ${a.name}`, type: 'public', dLat: -0.0035, dLng: 0.0025, rate: { car: 25, bike: 10, other: 40 }, areas: [['Main Parking Area', 'M', 50, ['car', 'bike']]], featured: false, is24x7: true },
      ];
      const built = await createParking({ attractionId: attraction._id, cityId, a, specs, address: a.address });
      nLoc += built.locations; nSlots += built.slots;
    }
  }

  // ----- every other city: one attraction + one public parking lot so parking always exists -----
  let gi = 0;
  for (const c of cityDocs) {
    if (curated.has(c.slug)) continue;
    const base = STATE_COORDS[c.state] || DEFAULT_COORDS;
    const jitterLat = (((gi * 37) % 100) / 100 - 0.5) * 0.6;
    const jitterLng = (((gi * 53) % 100) / 100 - 0.5) * 0.6;
    gi++;
    const lat = base[0] + jitterLat;
    const lng = base[1] + jitterLng;
    const cityId = cityIdBySlug.get(c.slug);
    const attraction = await Attraction.create({
      name: `${c.name} City Centre`, slug: slugify(`${c.name}-centre-${c.state}`), city: cityId, category: 'Other',
      shortDescription: `Central area of ${c.name}, ${c.state}.`,
      description: `Sample place in ${c.name}. Replace with a real attraction from the admin panel.`,
      address: `${c.name}, ${c.state}, India`, location: { lat, lng }, images: [cityImg.get(c.slug) || stateImg.get(c.state) || categoryImage('Other') || img(`pw-${c.slug}`)],
      openingHours: 'Not verified', hoursVerified: false, featured: false, popularity: 20,
    });
    const specs = [
      { name: `(Demo) Public Parking — ${c.name}`, type: 'public', dLat: 0.0012, dLng: 0.0010, rate: { car: 25, bike: 10, other: 40 }, areas: [['Main Parking Area', 'M', 50, ['car', 'bike']]], featured: false, is24x7: true },
    ];
    const built = await createParking({ attractionId: attraction._id, cityId, a: { name: c.name, address: `${c.name}, ${c.state}, India`, lat, lng }, specs, address: `${c.name}, ${c.state}, India` });
    nLoc += built.locations; nSlots += built.slots;
  }

  const states = new Set(cityDocs.map((c) => c.state));
  console.log(`\nSeed complete: ${cityDocs.length} cities across ${states.size} states/UTs, ${nLoc} demo parking locations, ${nSlots} slots.`);
  console.log(`Demo fees: Rs.${CONVENIENCE_FEE} convenience fee + ${TAX_PERCENT}% GST.`);
  console.log(`Admin login : ${adminEmail}  /  (password from SEED_ADMIN_PASSWORD in server/.env)`);
  if (env.nodeEnv !== 'production') console.log('Demo user   : user@parkwise.local  /  User@12345');
  await mongoose.disconnect();
}

// Creates parking areas + slots for a set of location specs.
async function createParking({ attractionId, cityId, a, specs, address }) {
  let locations = 0; let slots = 0;
  for (const s of specs) {
    const vehicleTypes = [...new Set(s.areas.flatMap((x) => x[3]))];
    const loc = await ParkingLocation.create({
      name: s.name, attraction: attractionId, city: cityId, type: s.type,
      address: `${address} (sample address)`, location: { lat: a.lat + s.dLat, lng: a.lng + s.dLng },
      description: 'DEMONSTRATION RECORD. Not real parking data. Slot availability is operator-managed demo data, not detected automatically.',
      vehicleTypes,
      pricing: vehicleTypes.map((v) => ({ vehicleType: v, ratePerHour: s.rate[v], minHours: 1, dailyCap: s.rate[v] * 8 })),
      convenienceFee: CONVENIENCE_FEE, taxPercent: TAX_PERCENT,
      operatingHours: { is24x7: s.is24x7, open: '06:00', close: '23:00' },
      verified: false, dataSource: 'demo', notes: 'Demo fees and hours - verify before using in production.', featured: s.featured,
    });
    locations++;
    for (const [areaName, code, count, types] of s.areas) {
      const area = await ParkingArea.create({ name: areaName, code, location: loc._id });
      const docs = Array.from({ length: count }, (_, i) => ({
        code: `${code}${String(i + 1).padStart(2, '0')}`, area: area._id, location: loc._id, vehicleTypes: types,
        manualStatus: i === count - 1 ? 'occupied' : 'available', // last slot of each area shows as "occupied" in the demo
        isActive: !(i === count - 2 && count > 5), // one inactive slot in bigger areas
      }));
      await ParkingSlot.insertMany(docs);
      slots += docs.length;
    }
  }
  return { locations, slots };
}

main().catch((e) => { console.error(e); process.exit(1); });
