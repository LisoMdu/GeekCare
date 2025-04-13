-- -----------------------------------------------------------------------------
-- Sample Medical Data Script - Run this after creating a test user
-- Replace 'YOUR_MEMBER_ID' with your actual member ID
-- -----------------------------------------------------------------------------

-- Sample Medical Queries
INSERT INTO public.medical_queries 
  (member_id, title, content, response, status, created_at) 
VALUES
  ('YOUR_MEMBER_ID', 'Persistent Headache Question', 'I''ve been experiencing persistent headaches for the past week, mainly in the mornings. What could be causing this and when should I seek medical attention?', 'Persistent morning headaches could be due to several factors including dehydration, poor sleep, caffeine withdrawal, or high blood pressure. Try staying hydrated, maintaining regular sleep patterns, and reducing stress. If headaches persist for more than 2 weeks, are severe, or are accompanied by fever, vision changes, or neck stiffness, please schedule an appointment immediately.', 'answered', NOW() - INTERVAL '5 days'),
  
  ('YOUR_MEMBER_ID', 'Knee Pain After Running', 'I recently started running again after a long break. I''m experiencing knee pain after my runs, especially when climbing stairs. Is this normal or should I be concerned?', NULL, 'pending', NOW() - INTERVAL '2 days'),
  
  ('YOUR_MEMBER_ID', 'Vitamin D Supplements', 'My recent blood work showed low vitamin D levels. What supplement dosage would you recommend and are there any specific brands I should look for?', 'For moderate vitamin D deficiency, I typically recommend 2000-4000 IU daily for 8-12 weeks, then reducing to a maintenance dose of 1000-2000 IU daily. Look for supplements that contain vitamin D3 (cholecalciferol) rather than D2 as it''s more effective at raising blood levels. Most reputable brands are fine - just ensure they have USP verification on the label for quality assurance. Take with a meal containing some fat for better absorption.', 'answered', NOW() - INTERVAL '10 days');

-- Sample Medical Records
INSERT INTO public.medical_records 
  (member_id, title, type, date, physician_name, file_url, description) 
VALUES
  ('YOUR_MEMBER_ID', 'Annual Physical Examination Results', 'document', NOW() - INTERVAL '3 months', 'Dr. Johnson', 'https://fakefileurl.com/annual_physical_2023.pdf', 'Complete results from your annual physical examination including vitals, lab work, and physician notes.'),
  
  ('YOUR_MEMBER_ID', 'Cholesterol Panel', 'lab', NOW() - INTERVAL '3 months', 'Dr. Johnson', 'https://fakefileurl.com/cholesterol_panel_2023.pdf', 'Lipid profile including total cholesterol, HDL, LDL, and triglycerides. Results show normal ranges for all values.'),
  
  ('YOUR_MEMBER_ID', 'Vitamin D Prescription', 'prescription', NOW() - INTERVAL '9 days', 'Dr. Martinez', 'https://fakefileurl.com/vitamin_d_rx.pdf', 'Prescription for Vitamin D3 50,000 IU weekly for 8 weeks to address deficiency.'),
  
  ('YOUR_MEMBER_ID', 'X-Ray Right Knee', 'lab', NOW() - INTERVAL '1 year', 'Dr. Wilson', 'https://fakefileurl.com/knee_xray.jpg', 'X-ray images of right knee following sports injury. No fractures observed, mild inflammation noted.'); 