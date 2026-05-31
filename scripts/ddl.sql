CREATE TABLE IF NOT EXISTS public.ocr_jobs
(
  id            uuid                     default gen_random_uuid() not null
    constraint "PK_ef6e873087a3947edfb3f2499cc"
      primary key,
  job_type      varchar(100)                                        not null,
  job_status    varchar(50)                                         not null,
  requested_by  varchar(255),
  file_path     text                                                not null,
  file_storage  varchar(20)                                         not null,
  requested_on  timestamp with time zone default now()              not null,
  completed_on  timestamp with time zone,
  error_message text,
  job_meta      jsonb                    default '{}'::jsonb        not null,
  created_at    timestamp with time zone default now()              not null,
  updated_at    timestamp with time zone default now()
);



CREATE TABLE IF NOT EXISTS public.bill_infos
(
  id               uuid                     default gen_random_uuid() not null
    constraint "PK_f1ba71d68d1044efc343efef546"
      primary key,
  job_id           uuid                                                not null,
  merchant_name    varchar(255),
  merchant_address text,
  bill_date        date,
  bill_time        time,
  currency         varchar(10),
  subtotal_amount  numeric(18, 2),
  tax_amount       numeric(18, 2),
  service_charge   numeric(18, 2),
  tip_amount       numeric(18, 2),
  discount_amount  numeric(18, 2),
  total_amount     numeric(18, 2),
  udf1             text,
  udf2             text,
  created_at       timestamp with time zone default now()              not null,
  bill_format      text,
  bill_date_bs     text
);

CREATE TABLE IF NOT EXISTS public.bill_items
(
  id          uuid                     default gen_random_uuid() not null
    constraint "PK_729cb3e07036682e6695f4bac3f"
      primary key,
  bill_id     uuid                                                not null
    constraint "FK_b424156152a3230b034bdb51db4"
      references public.bill_infos
      on delete cascade,
  item_name   varchar(500),
  quantity    numeric(18, 2),
  unit_price  numeric(18, 2),
  total_price numeric(18, 2),
  udf1        text,
  udf2        text,
  created_at  timestamp with time zone default now()              not null
);



CREATE TABLE IF NOT EXISTS public.api_logs
(
  id               uuid                     default gen_random_uuid() not null
    constraint "PK_ea3f2ad34a2921407593ff4425b"
      primary key,
  url              text                                                not null,
  request_payload  jsonb,
  response_payload jsonb,
  requested_on     timestamp with time zone                            not null,
  response_on      timestamp with time zone,
  status           varchar(50),
  owner_type       varchar(100)                                        not null,
  owner_id         uuid                                                not null,
  created_at       timestamp with time zone default now()              not null
);



