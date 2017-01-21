#!/usr/bin/env bash
DIR="$(dirname "$0")";

exec 3>&1

set -e;

do_a_ip() {
    local amount="$1"
    local start="$2"
    local start_ip="$3";
    local to="$(echo "${amount}"$'\n'"${start}"$'\n'"-1" | awk '{ sum += $1; } END { print sum; }')";
    local ips="";
    local ip="";


    log "Spawning IPs"
    while read number; do
        ip="$start_ip:$(printf "%x" "${number}" | colonize)"
        create_ip "${ip}";
        ips="${ips},${ip}";
        log "$number = $ip = $(echo -n "$ips" | wc -c)";
    done <<< "$(seq "$start" "$to")"

    log "Running Hebi-Neko";
    node "$DIR/index.js" "$(echo "$ips" | sed 's/,$//')"
}

log() {
    echo $@ 1>&3;
}

create_ip() {
    log "Creating IP: $1";
    result="$(sudo ip address add "$1/64" dev "${DEV:-eth0}" 2>&1 || true)";
    if ! ( [ -z "$result" ] || echo "$result" | grep -q "File exists"); then
        log "Creating IP failed: $result";
        exit 1;
    fi
    #true;
}

colonize () {
    rev | sed 's/[0-9a-f]\{4\}/\0:/g' | rev | sed 's/^://'
}

main() {
    do_a_ip $@;
}

main $@;
