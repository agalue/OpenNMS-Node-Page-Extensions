#!/bin/sh
#
# Node Extensions installer:
#
# - Copy the Angular App to the OpenNMS WebApp.
# - Add a reference to the JS file on node.jsp if it doesn't exist.
# - Add a reference to the Angular component on node.jsp if it doesn't exist.
# - Add data collection configuration, if it is not there.
#
#  @author Alejandro Galue <agalue@opennms.org>

# Exit at first failure
set -e

runas="root"
myuser="`id -u -n`"
if [ x"$myuser" = x"$runas" ]; then
  true # all is well
else
  echo "Error: you must run this script as '$runas', not '$myuser'" >&2
  exit 4  # According to LSB: 4 - user had insufficient privileges
fi

onms_home=/opt/opennms
if [ ! -e $onms_home ]; then
  onms_home=/usr/share/opennms
fi
if [ ! -e $onms_home ]; then
  echo "ERROR: cannot find OpenNMS home directory.";
  exit 1;
fi

echo "Installing the Node Extensions..."

webapp_dir=$onms_home/jetty-webapps/opennms
data_collection_dir=$onms_home/etc/datacollection
node_jsp=$webapp_dir/element/node.jsp
app_dir=$webapp_dir/js/node-extensions

echo "Copying Angular Application to $app_dir ..."
if [ ! -e $app_dir ]; then
  mkdir -p $app_dir
fi
cp -f src/* $app_dir

echo "Checking node.jsp ..."

if ! grep --quiet 'src="js/node-extensions/app.js"' $node_jsp; then
  echo "Adding a reference to the Angular App..."
  data="<jsp:param name=\"script\" value='<script type=\"text/javascript\" src=\"js/node-extensions/app.js\"></script>' />"
  awk -v "var=$data" '/[<]\/jsp:include[>]/ && !x {print var; x=1}1' $node_jsp > /tmp/_node.jsp
  mv -f /tmp/_node.jsp $node_jsp
else
  echo "Angular App already referenced."
fi

if ! grep --quiet 'div id="node-extensions"' $node_jsp; then
  echo "Adding the Node Extensions Tag..."
  cat <<EOF > /tmp/_include
  <div id="node-extensions">
    <node-extensions nodeId="\${model.id}" sysObjectId="\${model.node.sysObjectId}"/>
  </div>
EOF
  sed -i $'/Recent outages box/{e cat /tmp/_include\n}' $node_jsp
  rm /tmp/_include
else
  echo "Node Extensions Tag already placed."
fi

echo "Copying configuration files..."

for file in resources/datacollection/*.xml; do
  xml=`echo $file | sed 's|.*/||'`
  echo "Checking $data_collection_dir/$xml ..."
  if [ ! -e "$data_collection_dir/$xml" ]; then
    echo "Copying $xml ..."
    cp $file $data_collection_dir
  else
    echo "$xml already exist, assuming it is correct."
  fi
done

echo "Done!"