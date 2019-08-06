#!/bin/sh
#
# Node Extensions check/validator:
#
# - Verifies if a given device supports the extension.
#
#  @author Alejandro Galue <agalue@opennms.org>

# Exit at first failure
set -e

IP=$1
COMMUNITY=${2}

ruckusZD() {
  echo "Checking Ruckus ZoneDirector..."
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.25053.1.2.2.1.1.1.1.1
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1
}

ruckusSZ() {
  echo "Checking Ruckus SmartZone..."
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.25053.1.4.2.1.1.1.2.1 
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1
}

ciscoWLC() {
  echo "Checking Cisco WLC..."
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.9.9.513.1.1.1.1 
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.9.9.513.1.1.9.1 
  snmpwalk -One -v 2c -c $COMMUNITY $IP .1.3.6.1.4.1.14179.2.2.1.1
}

if [ "$IP" == "" ]; then
  echo "ERROR: IP Address or FQDN of the device is required."
  exit 0;
fi

if [ "$COMMUNITY" == "" ]; then
  echo "ERROR: SNMP Read Community String is required."
  exit 0;
fi

SYSOID=$(snmpget -Onv -v 2c -c $COMMUNITY $IP .1.3.6.1.2.1.1.2.0 | sed 's/OID: //')
echo "The sysObjectID is $SYSOID..."

case $SYSOID in
  .1.3.6.1.4.1.9.1.2370)
    ciscoWLC
    ;;
  .1.3.6.1.4.1.9.1.2371)
    ciscoWLC
    ;;
  .1.3.6.1.4.1.9.1.2170)
    ciscoWLC
    ;;
  .1.3.6.1.4.1.9.1.1279)
    ciscoWLC
    ;;
  .1.3.6.1.4.1.25053.3.1.5.15)
    ruckusZD
    ;;
 
  *)
    echo "Unknown..."
    ;;
esac
