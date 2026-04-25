-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  age int,
  gender text check (gender in ('male', 'female')),
  weight numeric(5,2),
  height numeric(5,2),
  goal text check (goal in ('lose_weight', 'maintain', 'gain_muscle')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = id);

-- Exercises library
create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  muscle_group text not null,
  equipment text,
  created_at timestamptz default now()
);
alter table public.exercises enable row level security;
create policy "Everyone can read exercises" on public.exercises
  for select using (true);

-- Workouts
create table public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  name text not null,
  notes text,
  duration_minutes int,
  created_at timestamptz default now()
);
alter table public.workouts enable row level security;
create policy "Users can manage own workouts" on public.workouts
  for all using (auth.uid() = user_id);

-- Workout exercises
create table public.workout_exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  "order" int not null default 0,
  created_at timestamptz default now()
);
alter table public.workout_exercises enable row level security;
create policy "Users can manage own workout exercises" on public.workout_exercises
  for all using (
    auth.uid() = (select user_id from public.workouts where id = workout_id)
  );

-- Workout sets
create table public.workout_sets (
  id uuid default gen_random_uuid() primary key,
  workout_exercise_id uuid references public.workout_exercises(id) on delete cascade not null,
  set_number int not null,
  weight_kg numeric(6,2),
  reps int,
  duration_seconds int,
  completed boolean default false,
  created_at timestamptz default now()
);
alter table public.workout_sets enable row level security;
create policy "Users can manage own workout sets" on public.workout_sets
  for all using (
    auth.uid() = (
      select w.user_id from public.workouts w
      join public.workout_exercises we on we.workout_id = w.id
      where we.id = workout_exercise_id
    )
  );

-- Food entries
create table public.food_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')) not null,
  food_name text not null,
  amount_grams numeric(7,2) not null,
  calories numeric(7,2) not null,
  protein_g numeric(6,2) not null default 0,
  fat_g numeric(6,2) not null default 0,
  carbs_g numeric(6,2) not null default 0,
  created_at timestamptz default now()
);
alter table public.food_entries enable row level security;
create policy "Users can manage own food entries" on public.food_entries
  for all using (auth.uid() = user_id);

-- Seed basic exercises
insert into public.exercises (name, muscle_group, equipment) values
  ('Жим штанги лёжа', 'Грудь', 'Штанга'),
  ('Жим гантелей лёжа', 'Грудь', 'Гантели'),
  ('Разводка гантелей', 'Грудь', 'Гантели'),
  ('Отжимания', 'Грудь', 'Без оборудования'),
  ('Тяга штанги в наклоне', 'Спина', 'Штанга'),
  ('Тяга гантели одной рукой', 'Спина', 'Гантели'),
  ('Подтягивания', 'Спина', 'Турник'),
  ('Тяга верхнего блока', 'Спина', 'Тренажёр'),
  ('Приседания со штангой', 'Ноги', 'Штанга'),
  ('Жим ногами', 'Ноги', 'Тренажёр'),
  ('Выпады с гантелями', 'Ноги', 'Гантели'),
  ('Разгибание ног', 'Ноги', 'Тренажёр'),
  ('Сгибание ног', 'Ноги', 'Тренажёр'),
  ('Икры стоя', 'Ноги', 'Тренажёр'),
  ('Жим штанги стоя', 'Плечи', 'Штанга'),
  ('Жим гантелей сидя', 'Плечи', 'Гантели'),
  ('Подъём гантелей в стороны', 'Плечи', 'Гантели'),
  ('Тяга штанги к подбородку', 'Плечи', 'Штанга'),
  ('Подъём штанги на бицепс', 'Бицепс', 'Штанга'),
  ('Подъём гантелей на бицепс', 'Бицепс', 'Гантели'),
  ('Молотки', 'Бицепс', 'Гантели'),
  ('Жим узким хватом', 'Трицепс', 'Штанга'),
  ('Французский жим', 'Трицепс', 'Штанга'),
  ('Отжимания на брусьях', 'Трицепс', 'Брусья'),
  ('Планка', 'Пресс', 'Без оборудования'),
  ('Скручивания', 'Пресс', 'Без оборудования'),
  ('Подъём ног в висе', 'Пресс', 'Турник'),
  ('Становая тяга', 'Спина', 'Штанга'),
  ('Румынская тяга', 'Ноги', 'Штанга'),
  ('Шраги', 'Плечи', 'Штанга');
