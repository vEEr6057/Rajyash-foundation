-- ============================================================================
-- DUMMY SEED DATA (~2 months of operation) — for demo / launch optics.
-- Applied to the live Supabase DB on 2026-06-27. NOT real data.
-- Every row id is prefixed (partner_seed_ / seed_donor_ / seed_vol_ / pkup_seed_)
-- so it can be removed cleanly (see CLEANUP at the bottom).
-- Re-run safe (ON CONFLICT DO NOTHING). Apply via Supabase SQL editor or MCP.
-- Single-tenant; runs as a privileged role (bypasses RLS).
-- ============================================================================

insert into partners (id,name,type,contact_name,contact_phone,contact_email,address,city,created_at,updated_at) values
 ('partner_seed_01','Spice Garden Restaurant','restaurant','Rakesh Shah','+91-9824011001','manager@spicegarden.example','CG Road','Ahmedabad', now()-interval '70 days', now()-interval '70 days'),
 ('partner_seed_02','Vrindavan Banquet Hall','hall','Nilesh Patel','+91-9824011002','events@vrindavan.example','SG Highway','Ahmedabad', now()-interval '66 days', now()-interval '66 days'),
 ('partner_seed_03','Patel Wedding Planners','event_planner','Hiral Mehta','+91-9824011003','book@patelweddings.example','Bodakdev','Ahmedabad', now()-interval '60 days', now()-interval '60 days'),
 ('partner_seed_04','Annapurna Caterers','restaurant','Jayesh Trivedi','+91-9824011004','info@annapurna.example','Maninagar','Ahmedabad', now()-interval '55 days', now()-interval '55 days'),
 ('partner_seed_05','Shreeji Sweets & Bakery','restaurant','Bhavna Desai','+91-9824011005','order@shreeji.example','Vastrapur','Ahmedabad', now()-interval '50 days', now()-interval '50 days'),
 ('partner_seed_06','Sharma Family','family','Anita Sharma','+91-9824011006',null,'Satellite','Ahmedabad', now()-interval '40 days', now()-interval '40 days'),
 ('partner_seed_07','Grand Celebrations','event_planner','Kunal Joshi','+91-9824011007','hello@grandceleb.example','Thaltej','Ahmedabad', now()-interval '30 days', now()-interval '30 days'),
 ('partner_seed_08','Tulsi Dining Hall','hall','Mahesh Rana','+91-9824011008','tulsi@hall.example','Paldi','Ahmedabad', now()-interval '20 days', now()-interval '20 days')
on conflict (id) do nothing;

insert into profiles (id,name,email,phone,role,city,onboarding_complete,partner_id,created_at,updated_at)
select 'seed_donor_'||lpad(n::text,2,'0'),
 (array['Rajesh Shah','Priya Patel','Amit Mehta','Sneha Desai','Vikram Joshi','Pooja Trivedi','Karan Modi','Riya Shah','Manish Rana','Hetal Pandya','Dev Acharya','Nisha Vyas'])[n],
 'donor'||n||'@example.com','+91-98240'||lpad((20000+n)::text,5,'0'),'donor','Ahmedabad',true,
 (array['partner_seed_01','partner_seed_02','partner_seed_03','partner_seed_04','partner_seed_05',null,null,null,null,null,null,null])[n],
 now()-((72-n*3)||' days')::interval, now()
from generate_series(1,12) n on conflict (id) do nothing;

insert into profiles (id,name,email,phone,role,city,onboarding_complete,created_at,updated_at)
select 'seed_vol_'||lpad(n::text,2,'0'),
 (array['Arjun Bhatt','Meera Shah','Rohan Soni','Kavya Nair','Sahil Khan','Ishita Rao','Yash Parmar','Tara Iyer'])[n],
 'vol'||n||'@example.com','+91-98250'||lpad((30000+n)::text,5,'0'),'volunteer','Ahmedabad',true,
 now()-((68-n*4)||' days')::interval, now()
from generate_series(1,8) n on conflict (id) do nothing;

-- delivered (historical, 150 over ~60 days)
insert into pickups (id,donor_id,volunteer_id,category,description,quantity,quantity_unit,window_start,window_end,address,lat,lng,safety_attested,status,claimed_at,delivered_at,created_at,updated_at)
select 'pkup_seed_d_'||lpad(n::text,4,'0'),
 'seed_donor_'||lpad(((n%12)+1)::text,2,'0'), 'seed_vol_'||lpad(((n%8)+1)::text,2,'0'),
 (array['cooked_meal','cooked_meal','cooked_meal','raw_produce','bakery','packaged'])[(n%6)+1]::food_category,
 (array['Veg thalis from a wedding','Leftover catering trays','Fresh sabzi & rotis','Surplus vegetables','Bread & pastries','Packed snack boxes','Dal-rice meals','Banquet buffet surplus'])[(n%8)+1],
 case when n%10<7 then 20+(random()*100)::int else 5+(random()*35)::int end,
 (case when n%10<7 then 'servings' else 'kg' end)::quantity_unit,
 created_ts+interval '1 hour', created_ts+interval '4 hours',
 (array['Satellite','Bopal','Vastrapur','Navrangpura','Maninagar','Bodakdev','Thaltej','Paldi','SG Highway','Chandkheda'])[(n%10)+1]||', Ahmedabad',
 23.02+(random()-0.5)*0.08, 72.57+(random()-0.5)*0.08, true, 'delivered'::pickup_status,
 created_ts+(random()*interval '2 hours'), created_ts+interval '2 hours'+(random()*interval '4 hours'),
 created_ts, created_ts+interval '6 hours'
from (select n, now()-interval '2 days'-(random()*interval '58 days') as created_ts from generate_series(1,150) n) s
on conflict (id) do nothing;

-- in-progress (10, recent)
insert into pickups (id,donor_id,volunteer_id,category,description,quantity,quantity_unit,window_start,window_end,address,lat,lng,safety_attested,status,claimed_at,delivered_at,created_at,updated_at)
select 'pkup_seed_p_'||lpad(n::text,3,'0'),
 'seed_donor_'||lpad(((n%12)+1)::text,2,'0'), 'seed_vol_'||lpad(((n%8)+1)::text,2,'0'),
 'cooked_meal'::food_category, (array['Lunch surplus','Evening catering','Event leftovers'])[(n%3)+1],
 30+(random()*60)::int, 'servings'::quantity_unit,
 created_ts+interval '1 hour', created_ts+interval '5 hours',
 (array['Satellite','Bopal','Vastrapur','Maninagar','Thaltej'])[(n%5)+1]||', Ahmedabad',
 23.02+(random()-0.5)*0.06, 72.57+(random()-0.5)*0.06, true,
 (array['accepted','en_route','picked_up'])[(n%3)+1]::pickup_status,
 created_ts+interval '30 minutes', null, created_ts, now()
from (select n, now()-(random()*interval '40 hours') as created_ts from generate_series(1,10) n) s
on conflict (id) do nothing;

-- open / requested (12, last 24h, unclaimed)
insert into pickups (id,donor_id,volunteer_id,category,description,quantity,quantity_unit,window_start,window_end,address,lat,lng,safety_attested,status,claimed_at,delivered_at,created_at,updated_at)
select 'pkup_seed_o_'||lpad(n::text,3,'0'),
 'seed_donor_'||lpad(((n%12)+1)::text,2,'0'), null,
 (array['cooked_meal','raw_produce','bakery','packaged'])[(n%4)+1]::food_category,
 (array['Fresh thalis ready','Surplus veggies','Cakes & bread','Snack packs'])[(n%4)+1],
 case when n%3<2 then 20+(random()*80)::int else 5+(random()*25)::int end,
 (case when n%3<2 then 'servings' else 'kg' end)::quantity_unit,
 now()+interval '2 hours', now()+interval '6 hours',
 (array['Satellite','Bopal','Navrangpura','Maninagar','Bodakdev','Paldi','SG Highway'])[(n%7)+1]||', Ahmedabad',
 23.02+(random()-0.5)*0.07, 72.57+(random()-0.5)*0.07, true, 'requested'::pickup_status, null, null,
 now()-(random()*interval '20 hours'), now()
from generate_series(1,12) n on conflict (id) do nothing;

-- ============================================================================
-- CLEANUP — remove all dummy seed data when real data takes over:
--   delete from pickups  where id like 'pkup_seed_%';
--   delete from profiles where id like 'seed_donor_%' or id like 'seed_vol_%';
--   delete from partners where id like 'partner_seed_%';
-- (Run in that order — pickups reference profiles/partners.)
-- ============================================================================
