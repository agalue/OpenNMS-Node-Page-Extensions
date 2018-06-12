/**
* @author Alejandro Galue <agalue@opennms.org>
*/

'use strict';

angular.module('node-extensions', [
  'ui.bootstrap'
])

/**
 * @ngdoc directive
 * @name nodeExtensions
 * @module node-extensions
 *
 * @description A directive to render a table with custom data.
 * It expects two attributes:
 * - id  : ID of the OpenNMS node instance
 * - oid : The systemObjectId of the OpenNMS node instance
 */
.directive('nodeExtensions', function() {
  return {
    restrict: 'E',
    scope: {
      nodeId: '@id',
      sysObjectId: '@oid'
    },
    templateUrl: 'js/node-extensions/template.html',
    controller: 'NodeExtensionsCtrl'
  };
})

/**
 * @ngdoc controller
 * @name NodeExtensionsCtrl
 * @module node-extensions
 *
 * @requires $scope Angular local scope
 * @requires $http Angular service that facilitates communication with the remote HTTP servers
 * @requires $q Angular promise/deferred implementation
 *
 * @description The controller for managing node extensions
 */
.controller('NodeExtensionsCtrl', function($scope, $http, $q) {

  /**
   * @description The columns array.
   * Each element should be an object with the following keys:
   * - name: The column unique identifier
   * - label: The human readable description of the column
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#columns
   * @propertyOf NodeExtensionsCtrl
   * @returns {array} The columns (default: empty array)
   */
  $scope.columns = [];

  /**
   * @description The rows array.
   * Each element should be an object with a key equal to the name of each defined column from the columns array.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#rows
   * @propertyOf NodeExtensionsCtrl
   * @returns {array} The rows (default: empty array)
   */
  $scope.rows = [];

  /**
   * @description The loading flag
   * Used to let the template know what should be rendered while loading data from the server.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#loading
   * @propertyOf NodeExtensionsCtrl
   * @returns {boolean} The loading flag (default: true)
   */
  $scope.loading = true;

  /**
   * @description The title
   * The title of the extension panel.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#title
   * @propertyOf NodeExtensionsCtrl
   * @returns {string} The panel title (default: 'Extension Panel')
   */
  $scope.title = 'Extension Panel';

  /**
   * @description Request the value of a metric from a given resource to the Measurements API
   *
   * @name NodeExtensionsCtrl:fetchMetricValue
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {string} id The OpenNMS Resource ID
   * @param {string} metric The name of the desired metric
   * @returns {promise} A promise with the value of the metric when successfully resolved.
   */
  $scope.fetchMetricValue = function(id, metric) {
    var deferred = $q.defer();
    $http.get('rest/measurements/' + id + '/' + metric + '?start=-900000')
      .success(function(info) {
        var values = info.columns[0].values.reverse();
        for (var i=0; i<values.length; i++) {
          if (values[i] !== 'NaN') {
            deferred.resolve(Math.floor(values[i]));
            break;
          }
        }
      })
      .error(function(err) {
        deferred.reject();
      });
    return deferred.promise;
  };

  /**
   * @description Request the value of a metric from a given resource to the Measurements API
   *
   * @name NodeExtensionsCtrl:fetchResources
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {string} id The OpenNMS Resource ID
   * @returns {promise} A promise with an array of OpenNMS resource objects when successfully resolved.
   */ 
  $scope.fetchResources = function(id) {
    var deferred = $q.defer();
    $http.get('rest/resources/fornode/' + id)
      .success(function(data) {
        $scope.loading = true;
        deferred.resolve(data.children.resource);
      })
      .error(function() {
        $scope.loading = false;
        deferred.reject();
      });
  };

  /**
   * @description Plugin Implementation Registration
   * If the provided sysObjectId matches the required criteria, a function is returned
   * with the plugin implementation.
   *
   * Each extension implementation will receive an array with the OpenNMS resources, and
   * it should populate $scope.title, $scope.columns, and $scope.rows.
   *
   * @name NodeExtensionsCtrl:getPluginImplementation
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @returns {function} A plugin implementation or undefined
   */ 
  $scope.getPluginImplementation = function() {
    if ($scope.sysObjectId.indexOf('.1.3.6.1.4.1.25053.3.1.5.') != -1) {
      return $scope.pluginSmartZoneData;
    } else if ($scope.sysObjectId.indexOf('.1.3.6.1.4.1.25053.3.1.11.') != -1) {
      return $scope.pluginZoneDirectorData;
    }
    return undefined;
  }

  /**
   * @description Plugin implementation for the Zone Director devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <!-- From RUCKUS-ZD-WLAN-MIB; ZoneDirector Devices -->
   * <group name="ruckusZDWLANAPTable" ifType="all">
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.2"  instance="ruckusZDWLANAPEntry" alias="rzdAPDescripion" type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.3"  instance="ruckusZDWLANAPEntry" alias="rzdAPStatus"     type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.10" instance="ruckusZDWLANAPEntry" alias="rzdAPIPAddress"  type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.15" instance="ruckusZDWLANAPEntry" alias="rzdAPNumSta"     type="integer"/>
   * </group>
   *
   * @name NodeExtensionsCtrl:pluginRuckusZoneDirectorData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginRuckusZoneDirectorData = function(resources) {
    for (r in resources) {
      if (r.id.match(/ruckusZDWLANAPEntry/)) {
        $scope.title = "Ruckus ZoneDirector Access Points";
        $scope.columns = [
          { name: 'description', label: 'Description' },
          { name: 'iPAddress', label: 'IP Address' },
          { name: 'numStations', label: '# Stations' },
          { name: 'status', label: 'Status' }
        ];
        var row = {
          description: r.stringPropertyAttributes.rzdAPDescripion,
          ipAddress: r.stringPropertyAttributes.rzdAPIPAddress,
          numStations: '...',
          status: 'Unknown'
        };
        switch (r.stringPropertyAttributes.rzdAPStatus) {
          case "0": row.status = "Disconnected"; break;
          case "1": row.status = "Connected"; break;
          case "2": row.status = "Approval Pending"; break;
          case "3": row.status = "Upgrading Firmware"; break;
          case "4": row.status = "Provisioning"; break;
        }
        var id = encodeURIComponent(r.id.replace('%3A',':'));
        $scope.fetchMetricValue(id, 'rzdAPNumSta').then(function(value) {
          row.numStations = value;
        });
        $scope.rows.push(row);
      }
    }
  }

  /**
   * @description Plugin implementation for the Ruckus Smart Zone devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <!-- From RUCKUS-SZ-WLAN-MIB; SmartZone Devices -->
   * <group name="ruckusSZAPTable" ifType="all">
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.5"  instance="ruckusSZAPEntry" alias="rszAPName"       type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.10" instance="ruckusSZAPEntry" alias="rszAPIp"         type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.15" instance="ruckusSZAPEntry" alias="rszAPNumSta"     type="integer"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.16" instance="ruckusSZAPEntry" alias="rszAPConnStatus" type="string"/>
   * </group>
   *
   * @name NodeExtensionsCtrl:pluginRuckusSmartZoneData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginRuckusSmartZoneData = function(resources) {
    for (r in resources) {
      if (r.id.match(/ruckusSZAPEntry/)) {
        $scope.title = "Ruckus SmartZone Access Points";
        $scope.columns = [
          { name: 'description', label: 'Description' },
          { name: 'iPAddress', label: 'IP Address' },
          { name: 'numStations', label: '# Stations' },
          { name: 'status', label: 'Status' }
        ];
        var row = {
          description: r.stringPropertyAttributes.rszAPName,
          ipAddress: r.stringPropertyAttributes.rszAPIp,
          numStations: '...',
          status: r.stringPropertyAttributes.rszAPConnStatus
        };
        var id = encodeURIComponent(r.id.replace('%3A',':'));
        $scope.fetchMetricValue(id, 'rzdAPNumSta').then(function(value) {
          row.numStations = value;
        });
        $scope.rows.push(row);
      }
    }
  }

  /**
   * The following code is executed as soon as the controller is loaded.
   *
   * It will try to obtain a plugin implementation for the provided sysObjectId.
   * When this is the case, the list of resources is obtained thrugh ReST, and then
   * the plygin is executed.
   *
   * Each extension implementation will receive an array with the OpenNMS resources, and
   * it should populate $scope.title, $scope.columns, and $scope.rows.
   */
   var plugin = $scope.getPluginImplementation();
   if (plugin) {
     $scope.fetchResources($scope.nodeId).then(function(resources) {
       plugin(resources);
     });
   } else {
     $scope.loading = false;
   }
});

// Bootstrap to a an element with ID 'node-extensions'

angular.element(document).ready(function () {
  var el = document.getElementById('node-extensions');
  angular.bootstrap(angular.element(el), ['node-extensions']);
});
