#!/bin/bash
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

echo "Verify OpenNMS version..."

onms_version=$(rpm -q --queryformat '%{VERSION}' opennms-core | sed 's/package .*//')
onms_flavor="Horizon"
if [ "$onms_version" == "" ]; then
  onms_version=$(rpm -q --queryformat '%{VERSION}' meridian-core)
  onms_flavor="Meridian"
fi
if [ "$onms_version" == "" ]; then
  echo "ERROR: cannot find OpenNMS version"
  exit 1;
fi
onms_major_version=$(echo $onms_version | cut -d'.' -f 1)

echo "Verify Boostrap version..."

echo "OpenNMS $onms_flavor $onms_major_version (version $onms_version) installed"
boostrap_version=3
if [ $onms_flavor == "Horizon" ] && [ $onms_major_version -gt 21 ]; then
  boostrap_version=4
fi
if [ $onms_flavor == "Meridian" ] && [ $onms_major_version -gt 2017 ]; then
  boostrap_version=4
fi
echo "Assuming Bootstrap $boostrap_version..."

echo "Installing the Node Extensions..."

webapp_dir=$onms_home/jetty-webapps/opennms
data_collection_xml=$onms_home/etc/datacollection-config.xml
data_collection_dir=$onms_home/etc/datacollection
node_jsp=$webapp_dir/element/node.jsp
app_dir=$webapp_dir/js/node-extensions

echo "Copying Angular Application to $app_dir ..."
if [ ! -e $app_dir ]; then
  mkdir -p $app_dir
fi
cp -f src/app.js $app_dir
cp -f src/template*.html $app_dir
sed -r -i "s/template.bootstrap./template.bootstrap$boostrap_version/" $app_dir/app.js

echo "Checking node.jsp ..."

if ! grep --quiet 'src="js/node-extensions/app.js"' $node_jsp; then
  cp $node_jsp $node_jsp.bak
  echo "Adding a reference to the Angular App..."
  if [ $boostrap_version -eq 3 ]; then
    data="<jsp:param name=\\\"script\\\" value=\\'<script type=\\\"text/javascript\\\" src=\\\"js/node-extensions/app.js\\\"></script>\\' />"
    sed -r -i "s|[<]/jsp:include[>]|$data\n&|" $node_jsp
  else
    data="<script type=\\\"text/javascript\\\" src=\\\"js/node-extensions/app.js\\\"></script>"
    sed -r -i "s|[<]/script[>]|&\n$data|" $node_jsp
  fi
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
  if [ ! -e "$data_collection_xml.bak" ]; then
    cp $data_collection_xml $data_collection_xml.bak
  fi
  dcg_name=$(grep 'datacollection-group.*name="' $file | sed 's/.*name="//' | sed 's/".*//')
  if ! grep --quiet "dataCollectionGroup=\"$dcg_name\"" $node_jsp; then
    data="      <include-collection dataCollectionGroup=\"$dcg_name\"/>"
    sed -r -i "s|[<]/rrd[>]|&\n$data|" $data_collection_xml
  fi
done

echo "Done!"
