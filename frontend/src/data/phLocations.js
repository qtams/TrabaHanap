// Places in the Philippines for "Preferred locations": regions, provinces and cities.
// Each entry is [name, where it is], the second part shown as a hint in the list.

const rows = (area, names) => names.split('|').map((n) => n.trim()).filter(Boolean).map((n) => [n, area])

export const PH_LOCATIONS = [
  ['Anywhere in the Philippines', 'Philippines'],
  ['Metro Manila', 'NCR'],
  ...rows('Metro Manila', `Manila|Quezon City|Makati|Taguig|Bonifacio Global City (BGC)|Pasig|Ortigas Center|Mandaluyong|
    San Juan|Pasay|Parañaque|Las Piñas|Muntinlupa|Alabang|Marikina|Caloocan|Malabon|Navotas|Valenzuela|Pateros`),

  // Regions
  ...rows('Region', `Ilocos Region|Cagayan Valley|Central Luzon|CALABARZON|MIMAROPA|Bicol Region|Western Visayas|
    Central Visayas|Eastern Visayas|Zamboanga Peninsula|Northern Mindanao|Davao Region|SOCCSKSARGEN|Caraga|
    Cordillera Administrative Region|Bangsamoro (BARMM)|Negros Island Region`),

  // Luzon
  ...rows('Luzon · province', `Abra|Apayao|Aurora|Bataan|Batanes|Batangas|Benguet|Bulacan|Cagayan|Camarines Norte|
    Camarines Sur|Catanduanes|Cavite|Ifugao|Ilocos Norte|Ilocos Sur|Isabela|Kalinga|La Union|Laguna|Marinduque|
    Masbate|Mountain Province|Nueva Ecija|Nueva Vizcaya|Occidental Mindoro|Oriental Mindoro|Palawan|Pampanga|
    Pangasinan|Quezon Province|Quirino|Rizal|Romblon|Sorsogon|Tarlac|Zambales|Albay`),
  ...rows('Luzon · city', `Baguio|Angeles|Clark|San Fernando (Pampanga)|Mabalacat|Olongapo|Subic|Balanga|Malolos|
    Meycauayan|San Jose del Monte|Cabanatuan|Gapan|Palayan|San Jose (Nueva Ecija)|Science City of Muñoz|Tarlac City|
    Dagupan|San Carlos (Pangasinan)|Urdaneta|Alaminos|San Fernando (La Union)|Laoag|Batac|Vigan|Candon|Tuguegarao|
    Cauayan|Ilagan|Santiago|Antipolo|Cainta|Taytay|Bacoor|Imus|Dasmariñas|General Trias|Cavite City|Tagaytay|
    Trece Martires|Carmona|Calamba|Santa Rosa|Biñan|Cabuyao|San Pedro|San Pablo|Los Baños|Batangas City|Lipa|
    Tanauan|Santo Tomas|Lucena|Tayabas|Naga|Iriga|Legazpi|Ligao|Tabaco|Sorsogon City|Masbate City|Puerto Princesa|
    Calapan`),

  // Visayas
  ...rows('Visayas · province', `Aklan|Antique|Biliran|Bohol|Capiz|Cebu|Eastern Samar|Guimaras|Iloilo|Leyte|
    Negros Occidental|Negros Oriental|Northern Samar|Samar|Siquijor|Southern Leyte`),
  ...rows('Visayas · city', `Cebu City|Mandaue|Lapu-Lapu|Mactan|Talisay (Cebu)|Danao|Toledo|Carcar|Naga (Cebu)|
    Iloilo City|Passi|Roxas|Bacolod|Silay|Talisay (Negros Occidental)|Kabankalan|San Carlos (Negros Occidental)|
    Dumaguete|Bais|Tanjay|Tagbilaran|Tacloban|Ormoc|Baybay|Maasin|Catbalogan|Calbayog|Borongan|Kalibo|Boracay|
    San Jose de Buenavista`),

  // Mindanao
  ...rows('Mindanao · province', `Agusan del Norte|Agusan del Sur|Basilan|Bukidnon|Camiguin|Cotabato|Davao de Oro|
    Davao del Norte|Davao del Sur|Davao Occidental|Davao Oriental|Dinagat Islands|Lanao del Norte|Lanao del Sur|
    Maguindanao|Misamis Occidental|Misamis Oriental|Sarangani|South Cotabato|Sultan Kudarat|Sulu|Surigao del Norte|
    Surigao del Sur|Tawi-Tawi|Zamboanga del Norte|Zamboanga del Sur|Zamboanga Sibugay`),
  ...rows('Mindanao · city', `Davao City|Tagum|Panabo|Island Garden City of Samal|Digos|Mati|Cagayan de Oro|Iligan|
    Gingoog|El Salvador|Malaybalay|Valencia|Butuan|Cabadbaran|Bayugan|Surigao City|Bislig|Tandag|General Santos|
    Koronadal|Kidapawan|Cotabato City|Tacurong|Zamboanga City|Dipolog|Dapitan|Pagadian|Isabela City|Ozamiz|
    Oroquieta|Tangub|Marawi|Lamitan`),
]
