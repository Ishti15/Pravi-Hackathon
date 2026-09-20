import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '../public/sample-data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Health CSV
// Columns: record_id,name,dob,gender,address,district,mobile,father_or_spouse_name,health_scheme_enrolled,identity_ref
const healthData = [
  // S1 / S2 Patel Family
  { record_id: 'HLT-0001', name: 'Rameshbhai Patel', dob: '12/05/1980', gender: 'M', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', mobile: '9825012345', father_or_spouse_name: 'Somabhai Patel', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000001' },
  { record_id: 'HLT-0002', name: 'Meena Patel', dob: '03/09/1984', gender: 'F', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', mobile: '9825012345', father_or_spouse_name: 'Rameshbhai Patel', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000002' },
  { record_id: 'HLT-0003', name: 'Rahul Patel', dob: '20/02/2011', gender: 'M', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', mobile: '9825012345', father_or_spouse_name: 'Rameshbhai Patel', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000003' },
  { record_id: 'HLT-0004', name: 'Priya Patel', dob: '15/07/2014', gender: 'F', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', mobile: '9825012345', father_or_spouse_name: 'Rameshbhai Patel', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000004' },
  // S4 Trap Ramesh
  { record_id: 'HLT-0005', name: 'Ramesh Patel', dob: '02/11/1975', gender: 'M', address: '7 Gayatri Nagar', district: 'Mehsana', mobile: '9898011223', father_or_spouse_name: 'Kanjibhai Patel', health_scheme_enrolled: 'N', identity_ref: '' },
  // S6 Missing DOB
  { record_id: 'HLT-0006', name: 'Jignesh Vaghela', dob: '', gender: 'M', address: 'Plot 14 GIDC Vatva', district: 'Ahmedabad', mobile: '9879055443', father_or_spouse_name: 'Mohanbhai', health_scheme_enrolled: 'N', identity_ref: '' },
  // S7 Exact duplicate pair
  { record_id: 'HLT-0007', name: 'Bharatbhai Joshi', dob: '10/10/1982', gender: 'M', address: '22 Shanti Kutir', district: 'Rajkot', mobile: '9723011234', father_or_spouse_name: 'Ravjibhai Joshi', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000005' },
  { record_id: 'HLT-0007', name: 'Bharatbhai Joshi', dob: '10/10/1982', gender: 'M', address: '22 Shanti Kutir', district: 'Rajkot', mobile: '9723011234', father_or_spouse_name: 'Ravjibhai Joshi', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000005' },
  // S9 Unassigned person
  { record_id: 'HLT-0008', name: 'Amit Trivedi', dob: '14/01/1992', gender: 'M', address: '5 Anand Park, Alkapuri', district: 'Vadodara', mobile: '9824099887', father_or_spouse_name: 'Natwarlal Trivedi', health_scheme_enrolled: 'N', identity_ref: '' },
  // S10 Missing income family member
  { record_id: 'HLT-0009', name: 'Manilal Baranda', dob: '15/03/1979', gender: 'M', address: 'Village Khedbrahma', district: 'Sabarkantha', mobile: '9428011234', father_or_spouse_name: 'Jethabhai Baranda', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000009' },
  // S11 Shah family (enrolled in health)
  { record_id: 'HLT-0010', name: 'Hasmukh Shah', dob: '08/04/1976', gender: 'M', address: '18 Mahavir Nagar, Karelibaug', district: 'Vadodara', mobile: '9898033445', father_or_spouse_name: 'Kantilal Shah', health_scheme_enrolled: 'Y', identity_ref: 'SYN-ID-000010' },
  // S12 Parmar family (enrolled in health)
  { record_id: 'HLT-0011', name: 'Suresh Parmar', dob: '25/08/1983', gender: 'M', address: '44 Maruti Society, Katargam', district: 'Surat', mobile: '9825088776', father_or_spouse_name: 'Danabhai Parmar', health_scheme_enrolled: 'Y', identity_ref: 'SYN-ID-000012' },
  // Bad row for validation
  { record_id: 'HLT-0012', name: 'Kamlesh Solanki', dob: '32/13/1990', gender: 'M', address: 'Unknown Wada', district: 'Ahmedabad', mobile: '9800000000', father_or_spouse_name: 'Popatlal', health_scheme_enrolled: 'N', identity_ref: '' },
  // Ordinary citizens
  { record_id: 'HLT-0013', name: 'Pravinbhai Chaudhari', dob: '1977-11-14', gender: 'M', address: 'Radhanpur Road', district: 'Mehsana', mobile: '9825123456', father_or_spouse_name: 'Ambalal Chaudhari', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000013' },
  { record_id: 'HLT-0014', name: 'Kokilaben Chaudhari', dob: '1981-03-21', gender: 'F', address: 'Radhanpur Road', district: 'Mehsana', mobile: '9825123456', father_or_spouse_name: 'Pravinbhai Chaudhari', health_scheme_enrolled: 'N', identity_ref: '' },
  { record_id: 'HLT-0015', name: 'Dahyabhai Vankar', dob: '1968-06-05', gender: 'M', address: 'Sector 24', district: 'Gandhinagar', mobile: '9427012345', father_or_spouse_name: 'Lallubhai Vankar', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000014' },
  { record_id: 'HLT-0016', name: 'Santokben Vankar', dob: '1972-09-18', gender: 'F', address: 'Sector 24', district: 'Gandhinagar', mobile: '9427012345', father_or_spouse_name: 'Dahyabhai Vankar', health_scheme_enrolled: 'N', identity_ref: '' },
  { record_id: 'HLT-0017', name: 'Jayeshbhai Mehta', dob: '1985-12-01', gender: 'M', address: '14 University Road', district: 'Rajkot', mobile: '9724012345', father_or_spouse_name: 'Bhikhabhai Mehta', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000015' },
  { record_id: 'HLT-0018', name: 'Chetan Gohil', dob: '1990-04-15', gender: 'M', address: 'Isanpur Char Rasta', district: 'Ahmedabad', mobile: '9898123456', father_or_spouse_name: 'Manubhai Gohil', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000016' },
  { record_id: 'HLT-0019', name: 'Nitin Prajapati', dob: '1982-08-25', gender: 'M', address: 'Waghodia Road', district: 'Vadodara', mobile: '9824123456', father_or_spouse_name: 'Ranchhodbhai Prajapati', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000017' },
  { record_id: 'HLT-0020', name: 'Kiranben Desai', dob: '1986-02-10', gender: 'F', address: 'Varachha Main Road', district: 'Surat', mobile: '9825234567', father_or_spouse_name: 'Haresh Desai', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000018' },
  { record_id: 'HLT-0021', name: 'Vijaysinh Jadeja', dob: '1979-07-30', gender: 'M', address: 'Kalawad Road', district: 'Rajkot', mobile: '9925012345', father_or_spouse_name: 'Pratapsinh Jadeja', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000019' },
  { record_id: 'HLT-0022', name: 'Vikram Thakor', dob: '1984-10-12', gender: 'M', address: 'Pethapur Village', district: 'Gandhinagar', mobile: '9879123456', father_or_spouse_name: 'Babuji Thakor', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000020' },
  { record_id: 'HLT-0023', name: 'Shankarbhai Rathva', dob: '1975-01-05', gender: 'M', address: 'Poj Road', district: 'Sabarkantha', mobile: '9426012345', father_or_spouse_name: 'Virsinh Rathva', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000021' },
  { record_id: 'HLT-0024', name: 'Ashokbhai Mistry', dob: '1980-05-20', gender: 'M', address: 'Bapunagar', district: 'Ahmedabad', mobile: '9825345678', father_or_spouse_name: 'Govindbhai Mistry', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000022' },
  { record_id: 'HLT-0025', name: 'Mukesh Pandya', dob: '1978-09-12', gender: 'M', address: 'Gotri Road', district: 'Vadodara', mobile: '9824234567', father_or_spouse_name: 'Chandrakant Pandya', health_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000023' }
];

// 2. Education CSV
// Columns: record_id,student_name,dob,gender,father_name,address,district,school,class,scholarship_enrolled,identity_ref
const educationData = [
  // S1 Rahul (not enrolled) and Priya (enrolled)
  { record_id: 'EDU-0001', student_name: 'Rahul Patel', dob: '20/02/2011', gender: 'M', father_name: 'Rameshbhai Patel', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', school: 'Kalol High School', class: '9', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000003' },
  { record_id: 'EDU-0002', student_name: 'Priya Patel', dob: '15/07/2014', gender: 'F', father_name: 'Rameshbhai Patel', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', school: 'Kalol Primary School', class: '6', scholarship_enrolled: 'Y', identity_ref: 'SYN-ID-000004' },
  // S11 Shah family student (enrolled)
  { record_id: 'EDU-0003', student_name: 'Aniket Shah', dob: '10/01/2012', gender: 'M', father_name: 'Hasmukh Shah', address: '18 Mahavir Nagar, Karelibaug', district: 'Vadodara', school: 'Navrachana Vidyalaya', class: '8', scholarship_enrolled: 'Y', identity_ref: 'SYN-ID-000011' },
  // Bad row (missing student_name)
  { record_id: 'EDU-0004', student_name: '', dob: '10/05/2013', gender: 'F', father_name: 'Unknown Father', address: 'Ellisbridge', district: 'Ahmedabad', school: 'Model School', class: '7', scholarship_enrolled: 'N', identity_ref: '' },
  // Additional students across districts
  { record_id: 'EDU-0005', student_name: 'Hardik Chaudhari', dob: '2010-08-14', gender: 'M', father_name: 'Pravinbhai Chaudhari', address: 'Radhanpur Road', district: 'Mehsana', school: 'Mehsana Sarvajanik High School', class: '10', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000024' },
  { record_id: 'EDU-0006', student_name: 'Kavita Chaudhari', dob: '2013-11-25', gender: 'F', father_name: 'Pravinbhai Chaudhari', address: 'Radhanpur Road', district: 'Mehsana', school: 'Mehsana Kanya Shala', class: '7', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000025' },
  { record_id: 'EDU-0007', student_name: 'Mahesh Vankar', dob: '2009-04-12', gender: 'M', father_name: 'Dahyabhai Vankar', address: 'Sector 24', district: 'Gandhinagar', school: 'Govt High School Gandhinagar', class: '11', scholarship_enrolled: 'Y', identity_ref: 'SYN-ID-000026' },
  { record_id: 'EDU-0008', student_name: 'Pooja Mehta', dob: '2012-06-18', gender: 'F', father_name: 'Jayeshbhai Mehta', address: '14 University Road', district: 'Rajkot', school: 'Rajkot Municipal School', class: '8', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000027' },
  { record_id: 'EDU-0009', student_name: 'Ketan Gohil', dob: '2014-09-02', gender: 'M', father_name: 'Chetan Gohil', address: 'Isanpur Char Rasta', district: 'Ahmedabad', school: 'Diwan Ballubhai School', class: '6', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000028' },
  { record_id: 'EDU-0010', student_name: 'Riddhi Prajapati', dob: '2011-12-19', gender: 'F', father_name: 'Nitin Prajapati', address: 'Waghodia Road', district: 'Vadodara', school: 'Sayaji High School', class: '9', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000029' },
  { record_id: 'EDU-0011', student_name: 'Meet Desai', dob: '2010-03-30', gender: 'M', father_name: 'Haresh Desai', address: 'Varachha Main Road', district: 'Surat', school: 'Surat Public School', class: '10', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000030' },
  { record_id: 'EDU-0012', student_name: 'Divyaraj Jadeja', dob: '2008-07-15', gender: 'M', father_name: 'Vijaysinh Jadeja', address: 'Kalawad Road', district: 'Rajkot', school: 'Saurashtra High School', class: '12', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000031' },
  { record_id: 'EDU-0013', student_name: 'Alpa Thakor', dob: '2013-05-08', gender: 'F', father_name: 'Vikram Thakor', address: 'Pethapur Village', district: 'Gandhinagar', school: 'Pethapur Primary School', class: '7', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000032' },
  { record_id: 'EDU-0014', student_name: 'Sunil Rathva', dob: '2011-01-22', gender: 'M', father_name: 'Shankarbhai Rathva', address: 'Poj Road', district: 'Sabarkantha', school: 'Ashram Shala Sabarkantha', class: '9', scholarship_enrolled: 'Y', identity_ref: 'SYN-ID-000033' },
  { record_id: 'EDU-0015', student_name: 'Bhavik Mistry', dob: '2015-10-10', gender: 'M', father_name: 'Ashokbhai Mistry', address: 'Bapunagar', district: 'Ahmedabad', school: 'Bapunagar Vidyamandir', class: '5', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000034' },
  { record_id: 'EDU-0016', student_name: 'Neha Pandya', dob: '2012-02-14', gender: 'F', father_name: 'Mukesh Pandya', address: 'Gotri Road', district: 'Vadodara', school: 'Baroda High School', class: '8', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000035' },
  { record_id: 'EDU-0017', student_name: 'Payal Dabhi', dob: '2010-09-09', gender: 'F', father_name: 'Kantilal Dabhi', address: 'Visnagar Link Road', district: 'Mehsana', school: 'Visnagar Kanya Vidyalaya', class: '10', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000036' },
  { record_id: 'EDU-0018', student_name: 'Chirag Chavda', dob: '2014-04-04', gender: 'M', father_name: 'Bharat Chavda', address: 'Udhna Main Road', district: 'Surat', school: 'Udhna Academy', class: '6', scholarship_enrolled: 'N', identity_ref: 'SYN-ID-000037' }
];

// 3. Food & Civil Supplies CSV
// Columns: record_id,ration_card_no,member_name,dob,gender,relationship_to_head,address,district,annual_income,card_type,identity_ref
const foodData = [
  // S1 / S3 Patel Family (GJ-RC-100001)
  // S3: Ramesh P Patel has older Sabarmati address -> lands in review
  { record_id: 'FOOD-0001', ration_card_no: 'GJ-RC-100001', member_name: 'Ramesh P Patel', dob: '12/05/1980', gender: 'M', relationship_to_head: 'HEAD', address: '45 Old Wada, Sabarmati', district: 'Ahmedabad', annual_income: '180000', card_type: 'GENERAL', identity_ref: '' },
  // S5: Meenaben R Patel shares identity_ref SYN-ID-000002 with Meena Patel
  { record_id: 'FOOD-0002', ration_card_no: 'GJ-RC-100001', member_name: 'Meenaben R Patel', dob: '1984-09-03', gender: 'F', relationship_to_head: 'SPOUSE', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', annual_income: '180000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000002' },
  { record_id: 'FOOD-0003', ration_card_no: 'GJ-RC-100001', member_name: 'Rahul Patel', dob: '20/02/2011', gender: 'M', relationship_to_head: 'SON', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', annual_income: '180000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000003' },
  { record_id: 'FOOD-0004', ration_card_no: 'GJ-RC-100001', member_name: 'Priya Patel', dob: '2014-07-15', gender: 'F', relationship_to_head: 'DAUGHTER', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', annual_income: '180000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000004' },
  
  // S4 Trap Ramesh family
  { record_id: 'FOOD-0005', ration_card_no: 'GJ-RC-100006', member_name: 'Ramesh Patel', dob: '02/11/1975', gender: 'M', relationship_to_head: 'HEAD', address: '7 Gayatri Nagar', district: 'Mehsana', annual_income: '220000', card_type: 'GENERAL', identity_ref: '' },
  { record_id: 'FOOD-0006', ration_card_no: 'GJ-RC-100006', member_name: 'Gitaben Patel', dob: '14/04/1978', gender: 'F', relationship_to_head: 'SPOUSE', address: '7 Gayatri Nagar', district: 'Mehsana', annual_income: '220000', card_type: 'GENERAL', identity_ref: '' },

  // S8 Solanki Family (Income 350000 in Food vs 200000 in Labour)
  { record_id: 'FOOD-0007', ration_card_no: 'GJ-RC-100002', member_name: 'Dineshbhai Solanki', dob: '05/06/1981', gender: 'M', relationship_to_head: 'HEAD', address: 'B-102 Ashray Flats, Chandkheda', district: 'Ahmedabad', annual_income: '350000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000006' },
  { record_id: 'FOOD-0008', ration_card_no: 'GJ-RC-100002', member_name: 'Bhavnaben Solanki', dob: '12/08/1985', gender: 'F', relationship_to_head: 'SPOUSE', address: 'B-102 Ashray Flats, Chandkheda', district: 'Ahmedabad', annual_income: '350000', card_type: 'GENERAL', identity_ref: '' },

  // S10 Missing Income Family
  { record_id: 'FOOD-0009', ration_card_no: 'GJ-RC-100003', member_name: 'Manilal Baranda', dob: '15/03/1979', gender: 'M', relationship_to_head: 'HEAD', address: 'Village Khedbrahma', district: 'Sabarkantha', annual_income: '', card_type: 'GENERAL', identity_ref: 'SYN-ID-000009' },
  { record_id: 'FOOD-0010', ration_card_no: 'GJ-RC-100003', member_name: 'Savitaben Baranda', dob: '20/08/1982', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Village Khedbrahma', district: 'Sabarkantha', annual_income: '', card_type: 'GENERAL', identity_ref: '' },

  // S11 Shah family (Fully enrolled, Priority card)
  { record_id: 'FOOD-0011', ration_card_no: 'GJ-RC-100004', member_name: 'Hasmukh Shah', dob: '08/04/1976', gender: 'M', relationship_to_head: 'HEAD', address: '18 Mahavir Nagar, Karelibaug', district: 'Vadodara', annual_income: '120000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000010' },
  { record_id: 'FOOD-0012', ration_card_no: 'GJ-RC-100004', member_name: 'Rekha Shah', dob: '19/12/1980', gender: 'F', relationship_to_head: 'SPOUSE', address: '18 Mahavir Nagar, Karelibaug', district: 'Vadodara', annual_income: '120000', card_type: 'PRIORITY', identity_ref: '' },
  { record_id: 'FOOD-0013', ration_card_no: 'GJ-RC-100004', member_name: 'Aniket Shah', dob: '10/01/2012', gender: 'M', relationship_to_head: 'SON', address: '18 Mahavir Nagar, Karelibaug', district: 'Vadodara', annual_income: '120000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000011' },

  // S12 Parmar family (Enrolled in Health via Dept)
  { record_id: 'FOOD-0014', ration_card_no: 'GJ-RC-100005', member_name: 'Suresh Parmar', dob: '25/08/1983', gender: 'M', relationship_to_head: 'HEAD', address: '44 Maruti Society, Katargam', district: 'Surat', annual_income: '210000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000012' },
  { record_id: 'FOOD-0015', ration_card_no: 'GJ-RC-100005', member_name: 'Gitaben Parmar', dob: '11/02/1987', gender: 'F', relationship_to_head: 'SPOUSE', address: '44 Maruti Society, Katargam', district: 'Surat', annual_income: '210000', card_type: 'GENERAL', identity_ref: '' },

  // Additional Families
  // Family 6: Chaudhari (Mehsana, Priority)
  { record_id: 'FOOD-0016', ration_card_no: 'GJ-RC-100007', member_name: 'Pravinbhai Chaudhari', dob: '1977-11-14', gender: 'M', relationship_to_head: 'HEAD', address: 'Radhanpur Road', district: 'Mehsana', annual_income: '140000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000013' },
  { record_id: 'FOOD-0017', ration_card_no: 'GJ-RC-100007', member_name: 'Kokilaben Chaudhari', dob: '1981-03-21', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Radhanpur Road', district: 'Mehsana', annual_income: '140000', card_type: 'PRIORITY', identity_ref: '' },
  { record_id: 'FOOD-0018', ration_card_no: 'GJ-RC-100007', member_name: 'Hardik Chaudhari', dob: '2010-08-14', gender: 'M', relationship_to_head: 'SON', address: 'Radhanpur Road', district: 'Mehsana', annual_income: '140000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000024' },
  { record_id: 'FOOD-0019', ration_card_no: 'GJ-RC-100007', member_name: 'Kavita Chaudhari', dob: '2013-11-25', gender: 'F', relationship_to_head: 'DAUGHTER', address: 'Radhanpur Road', district: 'Mehsana', annual_income: '140000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000025' },

  // Family 7: Vankar (Gandhinagar, Priority)
  { record_id: 'FOOD-0020', ration_card_no: 'GJ-RC-100008', member_name: 'Dahyabhai Vankar', dob: '1968-06-05', gender: 'M', relationship_to_head: 'HEAD', address: 'Sector 24', district: 'Gandhinagar', annual_income: '90000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000014' },
  { record_id: 'FOOD-0021', ration_card_no: 'GJ-RC-100008', member_name: 'Santokben Vankar', dob: '1972-09-18', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Sector 24', district: 'Gandhinagar', annual_income: '90000', card_type: 'PRIORITY', identity_ref: '' },
  { record_id: 'FOOD-0022', ration_card_no: 'GJ-RC-100008', member_name: 'Mahesh Vankar', dob: '2009-04-12', gender: 'M', relationship_to_head: 'SON', address: 'Sector 24', district: 'Gandhinagar', annual_income: '90000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000026' },

  // Family 8: Mehta (Rajkot, General)
  { record_id: 'FOOD-0023', ration_card_no: 'GJ-RC-100009', member_name: 'Jayeshbhai Mehta', dob: '1985-12-01', gender: 'M', relationship_to_head: 'HEAD', address: '14 University Road', district: 'Rajkot', annual_income: '280000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000015' },
  { record_id: 'FOOD-0024', ration_card_no: 'GJ-RC-100009', member_name: 'Kinjal Mehta', dob: '1988-05-15', gender: 'F', relationship_to_head: 'SPOUSE', address: '14 University Road', district: 'Rajkot', annual_income: '280000', card_type: 'GENERAL', identity_ref: '' },

  // Family 9: Gohil (Ahmedabad, Priority)
  { record_id: 'FOOD-0025', ration_card_no: 'GJ-RC-100010', member_name: 'Chetan Gohil', dob: '1990-04-15', gender: 'M', relationship_to_head: 'HEAD', address: 'Isanpur Char Rasta', district: 'Ahmedabad', annual_income: '160000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000016' },
  { record_id: 'FOOD-0026', ration_card_no: 'GJ-RC-100010', member_name: 'Neelam Gohil', dob: '1993-08-20', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Isanpur Char Rasta', district: 'Ahmedabad', annual_income: '160000', card_type: 'PRIORITY', identity_ref: '' },

  // Family 10: Prajapati (Vadodara, General)
  { record_id: 'FOOD-0027', ration_card_no: 'GJ-RC-100011', member_name: 'Nitin Prajapati', dob: '1982-08-25', gender: 'M', relationship_to_head: 'HEAD', address: 'Waghodia Road', district: 'Vadodara', annual_income: '240000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000017' },
  { record_id: 'FOOD-0028', ration_card_no: 'GJ-RC-100011', member_name: 'Hansaben Prajapati', dob: '1985-11-10', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Waghodia Road', district: 'Vadodara', annual_income: '240000', card_type: 'GENERAL', identity_ref: '' },

  // Family 11: Desai (Surat, General)
  { record_id: 'FOOD-0029', ration_card_no: 'GJ-RC-100012', member_name: 'Haresh Desai', dob: '1983-04-14', gender: 'M', relationship_to_head: 'HEAD', address: 'Varachha Main Road', district: 'Surat', annual_income: '260000', card_type: 'GENERAL', identity_ref: '' },
  { record_id: 'FOOD-0030', ration_card_no: 'GJ-RC-100012', member_name: 'Kiranben Desai', dob: '1986-02-10', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Varachha Main Road', district: 'Surat', annual_income: '260000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000018' },

  // Family 12: Jadeja (Rajkot, General)
  { record_id: 'FOOD-0031', ration_card_no: 'GJ-RC-100013', member_name: 'Vijaysinh Jadeja', dob: '1979-07-30', gender: 'M', relationship_to_head: 'HEAD', address: 'Kalawad Road', district: 'Rajkot', annual_income: '320000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000019' },

  // Family 13: Thakor (Gandhinagar, Priority)
  { record_id: 'FOOD-0032', ration_card_no: 'GJ-RC-100014', member_name: 'Vikram Thakor', dob: '1984-10-12', gender: 'M', relationship_to_head: 'HEAD', address: 'Pethapur Village', district: 'Gandhinagar', annual_income: '110000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000020' },
  { record_id: 'FOOD-0033', ration_card_no: 'GJ-RC-100014', member_name: 'Manjulaben Thakor', dob: '1987-01-25', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Pethapur Village', district: 'Gandhinagar', annual_income: '110000', card_type: 'PRIORITY', identity_ref: '' },

  // Family 14: Rathva (Sabarkantha, Priority)
  { record_id: 'FOOD-0034', ration_card_no: 'GJ-RC-100015', member_name: 'Shankarbhai Rathva', dob: '1975-01-05', gender: 'M', relationship_to_head: 'HEAD', address: 'Poj Road', district: 'Sabarkantha', annual_income: '85000', card_type: 'PRIORITY', identity_ref: 'SYN-ID-000021' },
  { record_id: 'FOOD-0035', ration_card_no: 'GJ-RC-100015', member_name: 'Kamlaben Rathva', dob: '1979-04-10', gender: 'F', relationship_to_head: 'SPOUSE', address: 'Poj Road', district: 'Sabarkantha', annual_income: '85000', card_type: 'PRIORITY', identity_ref: '' },

  // Family 15: Mistry (Ahmedabad, General)
  { record_id: 'FOOD-0036', ration_card_no: 'GJ-RC-100016', member_name: 'Ashokbhai Mistry', dob: '1980-05-20', gender: 'M', relationship_to_head: 'HEAD', address: 'Bapunagar', district: 'Ahmedabad', annual_income: '220000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000022' },

  // Family 16: Pandya (Vadodara, General)
  { record_id: 'FOOD-0037', ration_card_no: 'GJ-RC-100017', member_name: 'Mukesh Pandya', dob: '1978-09-12', gender: 'M', relationship_to_head: 'HEAD', address: 'Gotri Road', district: 'Vadodara', annual_income: '290000', card_type: 'GENERAL', identity_ref: 'SYN-ID-000023' },

  // Family 17: Dabhi (Mehsana, Priority)
  { record_id: 'FOOD-0038', ration_card_no: 'GJ-RC-100018', member_name: 'Kantilal Dabhi', dob: '1976-12-05', gender: 'M', relationship_to_head: 'HEAD', address: 'Visnagar Link Road', district: 'Mehsana', annual_income: '130000', card_type: 'PRIORITY', identity_ref: '' },

  // Family 18: Chavda (Surat, Priority)
  { record_id: 'FOOD-0039', ration_card_no: 'GJ-RC-100019', member_name: 'Bharat Chavda', dob: '1981-06-15', gender: 'M', relationship_to_head: 'HEAD', address: 'Udhna Main Road', district: 'Surat', annual_income: '150000', card_type: 'PRIORITY', identity_ref: '' }
];

// 4. Labour CSV
// Columns: record_id,worker_name,dob,gender,address,district,occupation,annual_income,worker_scheme_enrolled,identity_ref
const labourData = [
  // S1 / S2 Hero Ramesh Patel (Labour occupation for External route)
  { record_id: 'LAB-0001', worker_name: 'Ramesh Patel', dob: '1980-05-12', gender: 'M', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', occupation: 'LABOUR', annual_income: '180000', worker_scheme_enrolled: 'N', identity_ref: '' },
  // S8 Solanki Family (Income 200000 in Labour vs 350000 in Food)
  { record_id: 'LAB-0002', worker_name: 'Dinesh Solanki', dob: '1981-06-05', gender: 'M', address: 'B-102 Ashray Flats, Chandkheda', district: 'Ahmedabad', occupation: 'CONSTRUCTION', annual_income: '200000', worker_scheme_enrolled: 'Y', identity_ref: 'SYN-ID-000006' },
  // S9 Unassigned Person 1
  { record_id: 'LAB-0003', worker_name: 'Paresh Makwana', dob: '1988-11-20', gender: 'M', address: 'Street 4 Labour Colony, Katargam', district: 'Surat', occupation: 'FACTORY', annual_income: '140000', worker_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000007' },
  // Additional labour records
  { record_id: 'LAB-0004', worker_name: 'Dahyabhai Vankar', dob: '1968-06-05', gender: 'M', address: 'Sector 24', district: 'Gandhinagar', occupation: 'DAILY_WAGER', annual_income: '90000', worker_scheme_enrolled: 'Y', identity_ref: 'SYN-ID-000014' },
  { record_id: 'LAB-0005', worker_name: 'Chetan Gohil', dob: '1990-04-15', gender: 'M', address: 'Isanpur Char Rasta', district: 'Ahmedabad', occupation: 'WORKER', annual_income: '160000', worker_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000016' },
  { record_id: 'LAB-0006', worker_name: 'Vikram Thakor', dob: '1984-10-12', gender: 'M', address: 'Pethapur Village', district: 'Gandhinagar', occupation: 'LABOUR', annual_income: '110000', worker_scheme_enrolled: 'Y', identity_ref: 'SYN-ID-000020' },
  { record_id: 'LAB-0007', worker_name: 'Shankarbhai Rathva', dob: '1975-01-05', gender: 'M', address: 'Poj Road', district: 'Sabarkantha', occupation: 'AGRICULTURAL_LABOUR', annual_income: '85000', worker_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000021' },
  { record_id: 'LAB-0008', worker_name: 'Ashokbhai Mistry', dob: '1980-05-20', gender: 'M', address: 'Bapunagar', district: 'Ahmedabad', occupation: 'CARPENTER', annual_income: '220000', worker_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000022' },
  { record_id: 'LAB-0009', worker_name: 'Kantilal Dabhi', dob: '1976-12-05', gender: 'M', address: 'Visnagar Link Road', district: 'Mehsana', occupation: 'CONSTRUCTION', annual_income: '130000', worker_scheme_enrolled: 'N', identity_ref: '' },
  { record_id: 'LAB-0010', worker_name: 'Bharat Chavda', dob: '1981-06-15', gender: 'M', address: 'Udhna Main Road', district: 'Surat', occupation: 'TEXTILE_WORKER', annual_income: '150000', worker_scheme_enrolled: 'Y', identity_ref: '' },
  { record_id: 'LAB-0011', worker_name: 'Nitin Prajapati', dob: '1982-08-25', gender: 'M', address: 'Waghodia Road', district: 'Vadodara', occupation: 'POTTER', annual_income: '240000', worker_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000017' },
  { record_id: 'LAB-0012', worker_name: 'Haresh Desai', dob: '1983-04-14', gender: 'M', address: 'Varachha Main Road', district: 'Surat', occupation: 'DIAMOND_POLISHER', annual_income: '260000', worker_scheme_enrolled: 'N', identity_ref: '' }
];

// 5. Housing CSV
// Columns: record_id,applicant_name,dob,gender,address,district,annual_income,housing_status,housing_scheme_enrolled,identity_ref
const housingData = [
  // S1 Hero Patel family housing record (KUTCHA, not enrolled -> S1)
  { record_id: 'HSG-0001', applicant_name: 'Rameshbhai Patel', dob: '12/05/1980', gender: 'M', address: '12 Shivam Society, Kalol', district: 'Gandhinagar', annual_income: '180000', housing_status: 'KUTCHA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000001' },
  // S9 Unassigned Person 3
  { record_id: 'HSG-0002', applicant_name: 'Varshaben Rathod', dob: '1986-07-22', gender: 'F', address: 'Ramdevnagar Chali', district: 'Ahmedabad', annual_income: '95000', housing_status: 'KUTCHA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000008' },
  // S11 Shah family (enrolled in housing scheme)
  { record_id: 'HSG-0003', applicant_name: 'Hasmukh Shah', dob: '1976-04-08', gender: 'M', address: '18 Mahavir Nagar, Karelibaug', district: 'Vadodara', annual_income: '120000', housing_status: 'PUCCA', housing_scheme_enrolled: 'Y', identity_ref: 'SYN-ID-000010' },
  // Ordinary housing records
  { record_id: 'HSG-0004', applicant_name: 'Dahyabhai Vankar', dob: '1968-06-05', gender: 'M', address: 'Sector 24', district: 'Gandhinagar', annual_income: '90000', housing_status: 'KUTCHA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000014' },
  { record_id: 'HSG-0005', applicant_name: 'Vikram Thakor', dob: '1984-10-12', gender: 'M', address: 'Pethapur Village', district: 'Gandhinagar', annual_income: '110000', housing_status: 'KUTCHA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000020' },
  { record_id: 'HSG-0006', applicant_name: 'Shankarbhai Rathva', dob: '1975-01-05', gender: 'M', address: 'Poj Road', district: 'Sabarkantha', annual_income: '85000', housing_status: 'NONE', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000021' },
  { record_id: 'HSG-0007', applicant_name: 'Kantilal Dabhi', dob: '1976-12-05', gender: 'M', address: 'Visnagar Link Road', district: 'Mehsana', annual_income: '130000', housing_status: 'KUTCHA', housing_scheme_enrolled: 'N', identity_ref: '' },
  { record_id: 'HSG-0008', applicant_name: 'Bharat Chavda', dob: '1981-06-15', gender: 'M', address: 'Udhna Main Road', district: 'Surat', annual_income: '150000', housing_status: 'PUCCA', housing_scheme_enrolled: 'N', identity_ref: '' },
  { record_id: 'HSG-0009', applicant_name: 'Chetan Gohil', dob: '1990-04-15', gender: 'M', address: 'Isanpur Char Rasta', district: 'Ahmedabad', annual_income: '160000', housing_status: 'PUCCA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000016' },
  { record_id: 'HSG-0010', applicant_name: 'Pravinbhai Chaudhari', dob: '1977-11-14', gender: 'M', address: 'Radhanpur Road', district: 'Mehsana', annual_income: '140000', housing_status: 'PUCCA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000013' },
  { record_id: 'HSG-0011', applicant_name: 'Suresh Parmar', dob: '1983-08-25', gender: 'M', address: '44 Maruti Society, Katargam', district: 'Surat', annual_income: '210000', housing_status: 'PUCCA', housing_scheme_enrolled: 'N', identity_ref: 'SYN-ID-000012' }
];

function toCSV(headers, rows) {
  const headerLine = headers.join(',');
  const lines = rows.map(r => headers.map(h => {
    let val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      val = `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(','));
  return [headerLine, ...lines].join('\n') + '\n';
}

fs.writeFileSync(
  path.join(targetDir, 'health.csv'),
  toCSV(['record_id', 'name', 'dob', 'gender', 'address', 'district', 'mobile', 'father_or_spouse_name', 'health_scheme_enrolled', 'identity_ref'], healthData)
);

fs.writeFileSync(
  path.join(targetDir, 'education.csv'),
  toCSV(['record_id', 'student_name', 'dob', 'gender', 'father_name', 'address', 'district', 'school', 'class', 'scholarship_enrolled', 'identity_ref'], educationData)
);

fs.writeFileSync(
  path.join(targetDir, 'food.csv'),
  toCSV(['record_id', 'ration_card_no', 'member_name', 'dob', 'gender', 'relationship_to_head', 'address', 'district', 'annual_income', 'card_type', 'identity_ref'], foodData)
);

fs.writeFileSync(
  path.join(targetDir, 'labour.csv'),
  toCSV(['record_id', 'worker_name', 'dob', 'gender', 'address', 'district', 'occupation', 'annual_income', 'worker_scheme_enrolled', 'identity_ref'], labourData)
);

fs.writeFileSync(
  path.join(targetDir, 'housing.csv'),
  toCSV(['record_id', 'applicant_name', 'dob', 'gender', 'address', 'district', 'annual_income', 'housing_status', 'housing_scheme_enrolled', 'identity_ref'], housingData)
);

console.log('Successfully generated all 5 CSV files in public/sample-data/');
console.log(`Counts: Health=${healthData.length}, Education=${educationData.length}, Food=${foodData.length}, Labour=${labourData.length}, Housing=${housingData.length}`);
console.log(`Total rows = ${healthData.length + educationData.length + foodData.length + labourData.length + housingData.length}`);
