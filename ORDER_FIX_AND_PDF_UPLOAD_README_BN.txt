JN IT CENTER - Order fix and PDF result upload

এই আপডেটে:
1) Special Category-তে order তৈরি হওয়ার পর customer-side users collection থেকে সব admin খোঁজার নিষিদ্ধ query সরানো হয়েছে। আগে এই query permission-denied দিয়ে পুরো action-কে “Order Failed” দেখাতে পারত, যদিও order তৈরি হয়ে থাকতে পারে।
2) Admin result upload page-এ Google Drive link অথবা PDF upload—দুটি বিকল্প যোগ হয়েছে। একসঙ্গে দুটো বেছে নেওয়া যাবে না। PDF সর্বোচ্চ 10 MB।

প্রয়োগ:
- ZIP extract করে পরিবর্তিত ফাইলগুলো আপনার hosting-এ একই path-এ upload/replace করুন: special-category.js, admin-upload.html, admin-upload.js।
- Firebase Console > Storage > Rules-এ storage.rules ফাইলের নিয়মগুলো আপনার existing rules-এর সঙ্গে মিলিয়ে নিন এবং admin role check ঠিক আছে নিশ্চিত করে তবেই publish করুন।
- Firebase Storage চালু না থাকলে বা billing plan প্রয়োজন হলে direct PDF upload কাজ নাও করতে পারে; Google Drive link option তখনও ব্যবহার করা যাবে।
- Firestore rules খুলে সবার read/write allow করবেন না।
- আগে পুরো সাইটের backup নিন। ZIP-এর অন্যান্য ফাইল অপরিবর্তিত।

নোট: এটি source-code patch; আপনার live hosting বা Firebase-এ নিজে থেকে deploy করা হয়নি।
