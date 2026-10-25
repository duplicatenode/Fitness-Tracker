#!/usr/bin/env bash
# DEMO 9b - Redis role-based access: a MEMBER-level Redis user.
# Needs Redis 6+ (or a Memurai build with ACL support) and redis-cli 6+.
# Set the password in your shell first - it is never written into this file:
#   export REDIS_MEMBER_PASSWORD='choose-a-strong-password'
#   bash database/demo/09_redis_acl.sh
set -e
: "${REDIS_HOST:=127.0.0.1}"
: "${REDIS_PORT:=6379}"
: "${REDIS_MEMBER_PASSWORD:?set REDIS_MEMBER_PASSWORD first}"
ADMIN="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
MEMBER="env REDISCLI_AUTH=$REDIS_MEMBER_PASSWORD redis-cli -h $REDIS_HOST -p $REDIS_PORT --user ft_redis_member"

echo "== create the member user: only fittrack journal/photo/sensor/activity keys, read+write, no dangerous commands"
$ADMIN ACL SETUSER ft_redis_member on ">$REDIS_MEMBER_PASSWORD" \
    '~fittrack:journal:*' '~fittrack:photos:*' '~fittrack:sensors:*' '~fittrack:activity:*' \
    '+@read' '+@write' '+@stream' '-@dangerous' '-@admin'

echo "== member CAN write its journal"
$MEMBER SET fittrack:journal:1:acl-check '{"title":"acl check"}'
echo "== member CAN read it back"
$MEMBER GET fittrack:journal:1:acl-check
echo "== member CANNOT write an unlisted key (expect NOPERM)"
$MEMBER SET secret:admin-note 'hello' || true
echo "== member CANNOT run dangerous commands (expect NOPERM)"
$MEMBER FLUSHALL || true
$MEMBER KEYS '*' || true
echo "== clean up the test key"
$ADMIN DEL fittrack:journal:1:acl-check
