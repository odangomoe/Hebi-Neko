#!/usr/bin/env bash
DIR="$(dirname "$0")";

set -e;

do_a_ip() {
    local amount="$1"
    local start="$2"
    local start_ip="$3";
    local to="$(echo "${amount}"$'\n'"${start}"$'\n'"-1" | awk '{ sum += $1; } END { print sum; }')";
    local ips="";
    local ip="";


    echo "Spawning IPs"
    while read number; do
        ip="$start_ip:$(printf "%x" "${number}" | colonize)"
        create_ip "${ip}";
        ips="${ips},${ip}";
        echo "$number = $ip = $(echo -n "$ips" | wc -c)";
    done <<< "$(seq "$start" "$to")"

    echo "Running Hebi-Neko";
    node "$DIR/index.js" "$(echo "$ips" | sed 's/,$//')"
}

create_ip() {
    echo "Creating IP: $1" > /dev/tty;
    result="$(sudo ip address add "$1/64" dev enp7s0 2>&1 || true)";
    if ! ( [ -z "$result" ] || echo "$result" | grep -q "File exists"); then
        echo "Creating IP failed: $result" > /dev/tty;
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