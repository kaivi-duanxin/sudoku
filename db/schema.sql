create table if not exists sudoku_runs (
  id text primary key,
  player_name varchar(32) not null,
  level_id varchar(16) not null check (level_id in ('level-1', 'level-2')),
  seconds_elapsed integer not null check (seconds_elapsed >= 0),
  hints_used integer not null default 0 check (hints_used >= 0 and hints_used <= 5),
  completed_at timestamptz not null default now()
);

create index if not exists sudoku_runs_level_time_idx
  on sudoku_runs (level_id, seconds_elapsed asc, hints_used asc, completed_at asc);
