const BILINGUAL_40_QUESTIONS = [
  // SECTION A: General Knowledge & Current Affairs (12 Questions)
  { kind: "heading", id: "h1", text: "खण्ड - अ : सामान्य ज्ञान एवं समसामयिकी / SECTION - A : GENERAL KNOWLEDGE" },
  {
    kind: "question",
    id: "q1",
    stem: "1. Who was the first President of Independent India? / स्वतंत्र भारत के प्रथम राष्ट्रपति कौन थे?",
    options: ["(A) Dr. Rajendra Prasad / डॉ. राजेंद्र प्रसाद", "(B) Dr. S. Radhakrishnan / डॉ. सर्वपल्ली राधाकृष्णन", "(C) Jawaharlal Nehru / पं. जवाहरलाल नेहरू", "(D) Sardar Patel / सरदार पटेल"]
  },
  {
    kind: "question",
    id: "q2",
    stem: "2. Which planet is known as the 'Red Planet'? / किस ग्रह को 'लाल ग्रह' के रूप में जाना जाता है?",
    options: ["(A) Venus / शुक्र", "(B) Mars / मंगल", "(C) Jupiter / बृहस्पति", "(D) Mercury / बुध"]
  },
  {
    kind: "question",
    id: "q3",
    stem: "3. 'सत्यमेव जयते' मूल रूप से किस उपनिषद से लिया गया है? / From which Upanishad is 'Satyameva Jayate' taken?",
    options: ["(A) मुण्डक उपनिषद (Mundaka)", "(B) माण्डूक्य उपनिषद (Mandukya)", "(C) कठ उपनिषद (Katha)", "(D) छांदोग्य उपनिषद (Chandogya)"]
  },
  {
    kind: "question",
    id: "q4",
    stem: "4. The Tropic of Cancer passes through how many states of India? / कर्क रेखा भारत के कितने राज्यों से होकर गुजरती है?",
    options: ["(A) 6 states / 6 राज्य", "(B) 7 states / 7 राज्य", "(C) 8 states / 8 राज्य", "(D) 9 states / 9 राज्य"]
  },
  {
    kind: "question",
    id: "q5",
    stem: "5. कोणार्क का प्रसिद्ध सूर्य मंदिर किस राज्य में स्थित है? / In which state is the famous Konark Sun Temple located?",
    options: ["(A) ओडिशा (Odisha)", "(B) आंध्र प्रदेश (Andhra Pradesh)", "(C) तमिलनाडु (Tamil Nadu)", "(D) पश्चिम बंगाल (West Bengal)"]
  },
  {
    kind: "question",
    id: "q6",
    stem: "6. Which Article of the Indian Constitution deals with Fundamental Duties? / भारतीय संविधान का कौन-सा अनुच्छेद मूल कर्तव्यों से संबंधित है?",
    options: ["(A) Article 50 / अनुच्छेद 50", "(B) Article 51A / अनुच्छेद 51A", "(C) Article 52 / अनुच्छेद 52", "(D) Article 53 / अनुच्छेद 53"]
  },
  {
    kind: "question",
    id: "q7",
    stem: "7. काजीरंगा राष्ट्रीय उद्यान किस लुप्तप्राय जीव के लिए प्रसिद्ध है? / For which endangered animal is Kaziranga National Park famous?",
    options: ["(A) एक सींग वाला गैंडा (One-horned Rhino)", "(B) रॉयल बंगाल टाइगर (Royal Bengal Tiger)", "(C) एशियाई शेर (Asiatic Lion)", "(D) हिम तेंदुआ (Snow Leopard)"]
  },
  {
    kind: "question",
    id: "q8",
    stem: "8. Who is known as the 'Father of the Indian Constitution'? / 'भारतीय संविधान के जनक' के रूप में किसे जाना जाता है?",
    options: ["(A) Mahatma Gandhi / महात्मा गांधी", "(B) Dr. B.R. Ambedkar / डॉ. भीमराव अंबेडकर", "(C) B.N. Rau / बी. एन. राव", "(D) Sachchidananda Sinha / सच्चिदानंद सिन्हा"]
  },
  {
    kind: "question",
    id: "q9",
    stem: "9. मोहिनीअट्टम किस भारतीय राज्य का शास्त्रीय नृत्य है? / Mohiniyattam is the classical dance of which Indian state?",
    options: ["(A) केरल (Kerala)", "(B) कर्नाटक (Karnataka)", "(C) असम (Assam)", "(D) मणिपुर (Manipur)"]
  },
  {
    kind: "question",
    id: "q10",
    stem: "10. In which year was the Reserve Bank of India established? / भारतीय रिजर्व बैंक (RBI) की स्थापना किस वर्ष हुई थी?",
    options: ["(A) 1930", "(B) 1935", "(C) 1947", "(D) 1950"]
  },
  {
    kind: "question",
    id: "q11",
    stem: "11. 'वंदे मातरम' के रचयिता कौन हैं? / Who authored the national song 'Vande Mataram'?",
    options: ["(A) रवींद्रनाथ टैगोर", "(B) बंकिम चंद्र चट्टोपाध्याय", "(C) शरत चंद्र चट्टोपाध्याय", "(D) जयशंकर प्रसाद"]
  },
  {
    kind: "question",
    id: "q12",
    stem: "12. What is the currency of Japan? / जापान की आधिकारिक मुद्रा क्या है?",
    options: ["(A) Renminbi / रॅन्मिन्बी", "(B) Won / वॉन", "(C) Yen / येन", "(D) Baht / बाह्ट"]
  },

  // SECTION B: Mathematics & Quantitative Aptitude (13 Questions)
  { kind: "heading", id: "h2", text: "खण्ड - ब : गणित एवं संख्यात्मक अभिरुचि / SECTION - B : MATHEMATICS" },
  {
    kind: "question",
    id: "q13",
    stem: "13. वह कौन-सी संख्या है, जो पूर्ण है परन्तु प्राकृत नहीं? / Which number is a whole number but not a natural number?",
    options: ["(A) 0", "(B) 1", "(C) -1", "(D) 2"]
  },
  {
    kind: "question",
    id: "q14",
    stem: "14. If the ratio of two numbers is 3:4 and their LCM is 180, find the greater number. / यदि दो संख्याओं का अनुपात 3:4 है और उनका ल.स. 180 है, तो बड़ी संख्या ज्ञात कीजिए।",
    options: ["(A) 45", "(B) 60", "(C) 75", "(D) 90"]
  },
  {
    kind: "question",
    id: "q15",
    stem: "15. प्रथम 10 अभाज्य संख्याओं का औसत क्या होगा? / What is the average of the first 10 prime numbers?",
    options: ["(A) 10.1", "(B) 11.8", "(C) 12.9", "(D) 13.5"]
  },
  {
    kind: "question",
    id: "q16",
    stem: "16. If 15 men can complete a project in 20 days, in how many days can 25 men finish it? / यदि 15 पुरुष किसी कार्य को 20 दिन में पूरा करते हैं, तो 25 पुरुष उसे कितने दिनों में पूरा करेंगे?",
    options: ["(A) 10 days / 10 दिन", "(B) 12 days / 12 दिन", "(C) 14 days / 14 दिन", "(D) 16 days / 16 दिन"]
  },
  {
    kind: "question",
    id: "q17",
    stem: "17. एक वस्तु को ₹450 में बेचने पर 10% की हानि होती है। 20% लाभ प्राप्त करने के लिए इसे किस मूल्य पर बेचा जाना चाहिए?",
    options: ["(A) ₹540", "(B) ₹600", "(C) ₹620", "(D) ₹650"]
  },
  {
    kind: "question",
    id: "q18",
    stem: "18. A train running at 72 km/h crosses a 180 m long platform in 18 seconds. Find the length of the train. / 72 किमी/घंटा की गति से चल रही एक रेलगाड़ी 180 मीटर लंबे प्लेटफॉर्म को 18 सेकंड में पार करती है। रेलगाड़ी की लंबाई ज्ञात कीजिए।",
    options: ["(A) 150 m / मीटर", "(B) 180 m / मीटर", "(C) 200 m / मीटर", "(D) 220 m / मीटर"]
  },
  {
    kind: "question",
    id: "q19",
    stem: "19. किसी राशि पर 2 वर्ष के लिए 5% वार्षिक दर से साधारण ब्याज और चक्रवृद्धि ब्याज का अंतर ₹15 है। वह राशि ज्ञात कीजिए।",
    options: ["(A) ₹5000", "(B) ₹6000", "(C) ₹7500", "(D) ₹8000"]
  },
  {
    kind: "question",
    id: "q20",
    stem: "20. Simplify: [ (2/3) + (4/5) ] ÷ (7/15) = ? / सरल कीजिए: [ (2/3) + (4/5) ] ÷ (7/15) = ?",
    options: ["(A) 18/7", "(B) 22/7", "(C) 25/7", "(D) 29/7"]
  },
  {
    kind: "question",
    id: "q21",
    stem: "21. वृत्त का क्षेत्रफल 154 वर्ग सेमी है। इसकी परिधि क्या होगी? (π = 22/7) / The area of a circle is 154 sq cm. What is its circumference?",
    options: ["(A) 22 cm / सेमी", "(B) 44 cm / सेमी", "(C) 88 cm / सेमी", "(D) 66 cm / सेमी"]
  },
  {
    kind: "question",
    id: "q22",
    stem: "22. The sum of present ages of father and son is 60 years. 5 years ago, father's age was 4 times the son's age. What is son's present age?",
    options: ["(A) 12 years", "(B) 15 years", "(C) 18 years", "(D) 20 years"]
  },
  {
    kind: "question",
    id: "q23",
    stem: "23. 0.0064 का वर्गमूल क्या है? / What is the square root of 0.0064?",
    options: ["(A) 0.8", "(B) 0.08", "(C) 0.008", "(D) 0.0008"]
  },
  {
    kind: "question",
    id: "q24",
    stem: "24. If x + (1/x) = 5, find the value of x² + (1/x²). / यदि x + (1/x) = 5 है, तो x² + (1/x²) का मान ज्ञात कीजिए।",
    options: ["(A) 21", "(B) 23", "(C) 25", "(D) 27"]
  },
  {
    kind: "question",
    id: "q25",
    stem: "25. 40 लीटर दूध और पानी के मिश्रण में 10% पानी है। इसमें कितना पानी और मिलाया जाए कि पानी 20% हो जाए?",
    options: ["(A) 4 लीटर", "(B) 5 लीटर", "(C) 6 लीटर", "(D) 8 लीटर"]
  },

  // SECTION C: Science & Logical Reasoning (15 Questions)
  { kind: "heading", id: "h3", text: "खण्ड - स : विज्ञान एवं तार्किक अभिरुचि / SECTION - C : SCIENCE & REASONING" },
  {
    kind: "question",
    id: "q26",
    stem: "26. What is the chemical formula of common baking soda? / बेकिंग सोडा का रासायनिक सूत्र क्या है?",
    options: ["(A) Na2CO3", "(B) NaHCO3", "(C) NaCl", "(D) NaOH"]
  },
  {
    kind: "question",
    id: "q27",
    stem: "27. मानव शरीर में रक्तचाप मापने के लिए किस यंत्र का प्रयोग किया जाता है? / Which instrument is used to measure blood pressure in human body?",
    options: ["(A) बैरोमीटर (Barometer)", "(B) स्फिग्मोमैनोमीटर (Sphygmomanometer)", "(C) थर्मामीटर (Thermometer)", "(D) स्टेथोस्कोप (Stethoscope)"]
  },
  {
    kind: "question",
    id: "q28",
    stem: "28. Which component of blood helps in blood clotting? / रक्त का कौन-सा घटक रक्त के थक्के जमने में सहायक होता है?",
    options: ["(A) Red Blood Cells / लाल रक्त कणिकाएं", "(B) White Blood Cells / श्वेत रक्त कणिकाएं", "(C) Blood Platelets / रक्त प्लेटलेट्स", "(D) Plasma / प्लाज्मा"]
  },
  {
    kind: "question",
    id: "q29",
    stem: "29. ध्वनि तरंगें किस माध्यम में गमन नहीं कर सकती हैं? / Sound waves cannot propagate through which medium?",
    options: ["(A) ठोस (Solids)", "(B) द्रव (Liquids)", "(C) गैस (Gases)", "(D) निर्वात (Vacuum)"]
  },
  {
    kind: "question",
    id: "q30",
    stem: "30. What is the unit of electric resistance? / विद्युत प्रतिरोध की SI इकाई क्या है?",
    options: ["(A) Volt / वोल्ट", "(B) Ampere / एम्पीयर", "(C) Ohm / ओम", "(D) Watt / वाट"]
  },
  {
    kind: "question",
    id: "q31",
    stem: "31. निम्नलिखित में से कौन-सी एक प्राथमिक रंग (Primary Color) नहीं है? / Which of the following is NOT a primary color of light?",
    options: ["(A) लाल (Red)", "(B) हरा (Green)", "(C) नीला (Blue)", "(D) पीला (Yellow)"]
  },
  {
    kind: "question",
    id: "q32",
    stem: "32. In a code language, TEACHER is written as VGCEJGT. How will CHILDREN be written in that code?",
    options: ["(A) EJKNFTGP", "(B) EKJNITGP", "(C) EJKNFUGP", "(D) EJKNFTGM"]
  },
  {
    kind: "question",
    id: "q33",
    stem: "33. विषम पद चुनिए / Select the odd one out from the given alternatives:",
    options: ["(A) जनवरी (January)", "(B) अप्रैल (April)", "(C) जुलाई (July)", "(D) अगस्त (August)"]
  },
  {
    kind: "question",
    id: "q34",
    stem: "34. A person walks 5 km towards North, turns right and walks 3 km, then turns right and walks 5 km. In which direction is he from the starting point?",
    options: ["(A) North / उत्तर", "(B) South / दक्षिण", "(C) East / पूर्व", "(D) West / पश्चिम"]
  },
  {
    kind: "question",
    id: "q35",
    stem: "35. श्रेणी को पूरा कीजिए: 3, 8, 18, 38, 78, ? / Complete the series: 3, 8, 18, 38, 78, ?",
    options: ["(A) 154", "(B) 156", "(C) 158", "(D) 160"]
  },
  {
    kind: "question",
    id: "q36",
    stem: "36. Pointing to a photograph, Rohit said, 'She is the mother of my father's only son.' How is Rohit related to the person in the photograph?",
    options: ["(A) Brother", "(B) Son", "(C) Nephew", "(D) Father"]
  },
  {
    kind: "question",
    id: "q37",
    stem: "37. घड़ी में 3:40 बजे दोनों सुइयों के मध्य कितने डिग्री का कोण बनेगा? / What is the angle between hour and minute hands at 3:40?",
    options: ["(A) 120°", "(B) 130°", "(C) 135°", "(D) 140°"]
  },
  {
    kind: "question",
    id: "q38",
    stem: "38. Which gas is predominantly responsible for the greenhouse effect on Earth? / पृथ्वी पर ग्रीनहाउस प्रभाव के लिए मुख्य रूप से कौन-सी गैस उत्तरदायी है?",
    options: ["(A) Carbon Dioxide (CO2)", "(B) Oxygen (O2)", "(C) Nitrogen (N2)", "(D) Argon (Ar)"]
  },
  {
    kind: "question",
    id: "q39",
    stem: "39. यदि '+' का अर्थ गुणा, '-' का अर्थ भाग, '×' का अर्थ घटाव और '÷' का अर्थ जोड़ है, तो 20 + 5 - 10 × 4 ÷ 2 का मान क्या होगा?",
    options: ["(A) 8", "(B) 10", "(C) 12", "(D) 14"]
  },
  {
    kind: "question",
    id: "q40",
    stem: "40. Which vitamin is synthesized in human body by exposure to sunlight? / सूर्य के प्रकाश की उपस्थिति में मानव शरीर में किस विटामिन का संश्लेषण होता है?",
    options: ["(A) Vitamin A / विटामिन A", "(B) Vitamin B / विटामिन B", "(C) Vitamin C / विटामिन C", "(D) Vitamin D / विटामिन D"]
  }
];

if (typeof window !== "undefined") {
  window.BILINGUAL_40_QUESTIONS = BILINGUAL_40_QUESTIONS;
}

if (typeof module !== "undefined") {
  module.exports = { BILINGUAL_40_QUESTIONS };
}
