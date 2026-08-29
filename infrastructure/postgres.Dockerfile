# postgres:16 plus tzdata-legacy. Debian's tzdata dropped the legacy zone
# aliases (e.g. Asia/Calcutta) into a separate package; JVMs on Windows report
# exactly those legacy names as their default TimeZone, which pgjdbc sends in
# the connection startup packet - without this package every JDBC connection
# from such a machine dies with:
#   FATAL: invalid value for parameter "TimeZone": "Asia/Calcutta"
FROM postgres:16
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata-legacy \
    && rm -rf /var/lib/apt/lists/*
