/**
 * @author Alejandro Galue <agalue@opennms.org>
 */

'use strict';

const angular = require('angular');
require('angular-mocks');
require('angular-ui-bootstrap');
require('./app');

var createController, scope, httpBackend;

beforeEach(angular.mock.module('node-extensions', ($provide) => {
  $provide.value('$log', console);
}));

beforeEach(angular.mock.inject(($rootScope, $httpBackend, $controller) => {
  scope = $rootScope.$new();
  httpBackend = $httpBackend;
  createController = function(nodeId, sysObjectId) {
    scope.nodeId = nodeId;
    scope.sysObjectId = sysObjectId;
    return $controller('NodeExtensionsCtrl', {
      '$scope': scope
    });
  };
}));

afterEach(() => {
  httpBackend.verifyNoOutstandingExpectation();
  httpBackend.verifyNoOutstandingRequest();
});

test('Controller: NodeExtensionsCtrl: nothing happen on invalid OIDs', () => {
  createController(1, '.1.3.6.1.4.1.1000.1.1');
  expect(scope.loading).toEqual(false);
});

test('Controller: NodeExtensionsCtrl: checking Ruckus ZoneDirector', async() => {
  // Calls for Number of Connection

  httpBackend.whenGET('rest/measurements/node%5BTest%3ANode%5D.ruckusZDWLANAPEntry%5B6.0.0.0.0.0.1%5D/rzdAPNumSta?start=-900000').respond({
    step: 300000,
    start: 1529512122003,
    end: 1529513022003,
    timestamps: [1529511900000, 1529512200000, 1529512500000, 1529512800000, 1529513100000],
    labels: ['rzdAPNumSta'],
    columns: [{
      values: ['NaN', 2.0, 1.0, 1.0, 1.0]
    }],
    constants: [{
      key: 'rzdAPNumSta.rzdAPStatus',
      value: '1.0'
    }, {
      key: 'rzdAPNumSta.rzdAPIPAddress',
      value: '10.0.0.1'
    }, {
      key: 'rzdAPNumSta.rzdAPDescripion',
      value: 'AP 01'
    }]
  });
  httpBackend.whenGET('rest/measurements/node%5BTest%3ANode%5D.ruckusZDWLANAPEntry%5B6.0.0.0.0.0.2%5D/rzdAPNumSta?start=-900000').respond({
    step: 300000,
    start: 1529512122003,
    end: 1529513022003,
    timestamps: [1529511900000, 1529512200000, 1529512500000, 1529512800000, 1529513100000],
    labels: ['rzdAPNumSta'],
    columns: [{
      values: [0.0, 0.0, 0.0, 0.0, 0.0]
    }],
    constants: [{
      key: 'rzdAPNumSta.rzdAPStatus',
      value: '2.0'
    }, {
      key: 'rzdAPNumSta.rzdAPIPAddress',
      value: '10.0.0.2'
    }, {
      key: 'rzdAPNumSta.rzdAPDescripion',
      value: 'AP 02'
    }]
  });

  // Required call for getting node resources

  httpBackend.expectGET('rest/resources/fornode/1').respond({
    label: 'Test Node',
    name: 'Test:Node',
    link: 'element/node.jsp?node=Test:Node',
    children: {
      resource: [{
        id: 'node[Test%3ANode].nodeSnmp[]',
        label: 'Node-level Performance Data',
        typeLabel: 'SNMP Node Data'
      },{
        id: 'node[Test%3ANode].ruckusZDWLANAPEntry[6.0.0.0.0.0.1]',
        label: 'AP 01',
        typeLabel: 'Ruckus ZD AP',
        parentId: 'node[Test%3ANode].nodeSnmp[]',
        stringPropertyAttributes: {
          rzdAPIPAddress: '10.0.0.1',
          rzdAPDescripion: 'AP 01',
          rzdAPStatus: '1'
        },
        rrdGraphAttributes: {
          rzdAPNumSta: {
            name: 'rzdAPNumSta',
            relativePath: '',
            rrdFile: 'snmp:fs:Test:Node:ruckusZDWLANAPEntry:6.0.0.0.0.0.1:ruckusZDWLANAPTable'
          }
        }
      },{
        id: 'node[Test%3ANode].ruckusZDWLANAPEntry[6.0.0.0.0.0.2]',
        label: 'AP 02',
        typeLabel: 'Ruckus ZD AP',
        parentId: 'node[Test%3ANode].nodeSnmp[]',
        stringPropertyAttributes: {
          rzdAPIPAddress: '10.0.0.1',
          rzdAPDescripion: 'AP 01',
          rzdAPStatus: '2'
        },
        rrdGraphAttributes: {
          rzdAPNumSta: {
            name: 'rzdAPNumSta',
            relativePath: '',
            rrdFile: 'snmp:fs:Test:Node:ruckusZDWLANAPEntry:6.0.0.0.0.0.2:ruckusZDWLANAPTable'
          }
        }
      }]
    }
  });

  // Initializing Controller

  createController(1, '.1.3.6.1.4.1.25053.3.1.5.15');
  httpBackend.flush();

  // Checking data

  console.debug('Start valitations...');
  expect(scope.loading).toEqual(false);
  expect(scope.title).toEqual('Ruckus ZoneDirector Access Points');
  expect(scope.columns.length).toEqual(4);
  expect(scope.columns[0].name).toEqual('description');
  expect(scope.columns[1].name).toEqual('ipAddress');
  expect(scope.columns[2].name).toEqual('numStations');
  expect(scope.columns[3].name).toEqual('status');
  expect(scope.rows.length).toEqual(2);
  expect(scope.rows[0].description).toEqual('AP 01');
  expect(scope.rows[0].ipAddress).toEqual('10.0.0.1');
  expect(scope.rows[0].numStations).toEqual(1);
  expect(scope.rows[0].status).toEqual('Connected');
  console.debug('End validations.');
});


test('Controller: NodeExtensionsCtrl: checking Ruckus SmartZone', async() => {
  // Calls for Number of Connection

  httpBackend.whenGET('rest/measurements/node%5BTest%3ANode%5D.ruckusSZAPEntry%5B6.0.0.0.0.0.1%5D/rszAPNumSta?start=-900000').respond({
    step: 300000,
    start: 1529512122003,
    end: 1529513022003,
    timestamps: [1529511900000, 1529512200000, 1529512500000, 1529512800000, 1529513100000],
    labels: ['rszAPNumSta'],
    columns: [{
      values: ['NaN', 2.0, 1.0, 1.0, 1.0]
    }],
    constants: [{
      key: 'rszAPNumSta.rszAPConnStatus',
      value: 'Connect'
    }, {
      key: 'rszAPNumSta.rszAPIp',
      value: '10.0.0.1'
    }, {
      key: 'rszAPNumSta.rszAPName',
      value: 'AP 01'
    }]
  });
  httpBackend.whenGET('rest/measurements/node%5BTest%3ANode%5D.ruckusSZAPEntry%5B6.0.0.0.0.0.2%5D/rszAPNumSta?start=-900000').respond({
    step: 300000,
    start: 1529512122003,
    end: 1529513022003,
    timestamps: [1529511900000, 1529512200000, 1529512500000, 1529512800000, 1529513100000],
    labels: ['rszAPNumSta'],
    columns: [{
      values: [0.0, 0.0, 0.0, 0.0, 0.0]
    }],
    constants: [{
      key: 'rszAPNumSta.rszAPConnStatus',
      value: 'Disconnect'
    }, {
      key: 'rszAPNumSta.rszAPIp',
      value: '10.0.0.2'
    }, {
      key: 'rszAPNumSta.rszAPName',
      value: 'AP 02'
    }]
  });

  // Required call for getting node resources

  httpBackend.expectGET('rest/resources/fornode/1').respond({
    label: 'Test Node',
    name: 'Test:Node',
    link: 'element/node.jsp?node=Test:Node',
    children: {
      resource: [{
        id: 'node[Test%3ANode].nodeSnmp[]',
        label: 'Node-level Performance Data',
        typeLabel: 'SNMP Node Data'
      },{
        id: 'node[Test%3ANode].ruckusSZAPEntry[6.0.0.0.0.0.1]',
        label: 'AP 01',
        typeLabel: 'Ruckus SmartZone AP',
        parentId: 'node[Test%3ANode].nodeSnmp[]',
        stringPropertyAttributes: {
          rszAPIp: '10.0.0.1',
          rszAPName: 'AP 01',
          rszAPConnStatus: 'Connect'
        },
        rrdGraphAttributes: {
          rszAPNumSta: {
            name: 'rszAPNumSta',
            relativePath: '',
            rrdFile: 'snmp:fs:Test:Node:ruckusSZAPEntry:6.0.0.0.0.0.1:ruckusSZAPTable'
          }
        }
      },{
        id: 'node[Test%3ANode].ruckusSZAPEntry[6.0.0.0.0.0.2]',
        label: 'AP 02',
        typeLabel: 'Ruckus SmartZone AP',
        parentId: 'node[Test%3ANode].nodeSnmp[]',
        stringPropertyAttributes: {
          rszAPIp: '10.0.0.2',
          rszAPName: 'AP 02',
          rszAPConnStatus: 'Disconnect'
        },
        rrdGraphAttributes: {
          rszAPNumSta: {
            name: 'rszAPNumSta',
            relativePath: '',
            rrdFile: 'snmp:fs:Test:Node:ruckusSZAPEntry:6.0.0.0.0.0.2:ruckusSZAPTable'
          }
        }
      }]
    }
  });

  // Initializing Controller

  createController(1, '.1.3.6.1.4.1.25053.3.1.11.1');
  httpBackend.flush();

  // Checking data

  console.debug('Start valitations...');
  expect(scope.loading).toEqual(false);
  expect(scope.title).toEqual('Ruckus SmartZone Access Points');
  expect(scope.columns.length).toEqual(4);
  expect(scope.columns[0].name).toEqual('description');
  expect(scope.columns[1].name).toEqual('ipAddress');
  expect(scope.columns[2].name).toEqual('numStations');
  expect(scope.columns[3].name).toEqual('status');
  expect(scope.rows.length).toEqual(2);
  expect(scope.rows[0].description).toEqual('AP 01');
  expect(scope.rows[0].ipAddress).toEqual('10.0.0.1');
  expect(scope.rows[0].numStations).toEqual(1);
  expect(scope.rows[0].status).toEqual('Connect');
  console.debug('End validations.');
});

test('Controller: NodeExtensionsCtrl: checking Cisco WLC', async() => {
  // Calls for Number of Connection

  httpBackend.whenGET('rest/measurements/node%5BTest%3ANode%5D.ciscoAPMacAddress%5B6.0.0.0.0.0.1%5D/cLApAssocCount?start=-900000').respond({
    step: 300000,
    start: 1529512122003,
    end: 1529513022003,
    timestamps: [1529511900000, 1529512200000, 1529512500000, 1529512800000, 1529513100000],
    labels: ['cLApAssocCount'],
    columns: [{
      values: ['NaN', 2.0, 1.0, 1.0, 1.0]
    }],
    constants: [{
      key: 'cLApAssocCount.bsnAPOperStatus',
      value: 'Connect'
    }, {
      key: 'cLApAssocCount.bsnApIpAddress',
      value: '10.0.0.1'
    }, {
      key: 'cLApAssocCount.bsnAPName',
      value: 'AP 01'
    }]
  });
  httpBackend.whenGET('rest/measurements/node%5BTest%3ANode%5D.ciscoAPMacAddress%5B6.0.0.0.0.0.2%5D/cLApAssocCount?start=-900000').respond({
    step: 300000,
    start: 1529512122003,
    end: 1529513022003,
    timestamps: [1529511900000, 1529512200000, 1529512500000, 1529512800000, 1529513100000],
    labels: ['cLApAssocCount'],
    columns: [{
      values: [0.0, 0.0, 0.0, 0.0, 0.0]
    }],
    constants: [{
      key: 'cLApAssocCount.bsnAPOperStatus',
      value: 'Disconnect'
    }, {
      key: 'cLApAssocCount.bsnApIpAddress',
      value: '10.0.0.2'
    }, {
      key: 'cLApAssocCount.bsnAPName',
      value: 'AP 02'
    }]
  });

  // Required call for getting node resources

  httpBackend.expectGET('rest/resources/fornode/1').respond({
    label: 'Test Node',
    name: 'Test:Node',
    link: 'element/node.jsp?node=Test:Node',
    children: {
      resource: [{
        id: 'node[Test%3ANode].nodeSnmp[]',
        label: 'Node-level Performance Data',
        typeLabel: 'SNMP Node Data'
      },{
        id: 'node[Test%3ANode].ciscoAPMacAddress[6.0.0.0.0.0.1]',
        label: 'AP 01',
        typeLabel: 'Cisco WLC AP',
        parentId: 'node[Test%3ANode].nodeSnmp[]',
        stringPropertyAttributes: {
          bsnApIpAddress: '10.0.0.1',
          bsnAPName: 'AP 01',
          bsnAPOperStatus: '1',
          cLApName: 'AP 01',
        },
        rrdGraphAttributes: {
          rszAPNumSta: {
            name: 'cLApAssocCount',
            relativePath: '',
            rrdFile: 'snmp:fs:Test:Node:ciscoAPMacAddress:6.0.0.0.0.0.1:cLApTable'
          }
        }
      },{
        id: 'node[Test%3ANode].ciscoAPMacAddress[6.0.0.0.0.0.2]',
        label: 'AP 02',
        typeLabel: 'Cisco WLC AP',
        parentId: 'node[Test%3ANode].nodeSnmp[]',
        stringPropertyAttributes: {
          bsnApIpAddress: '10.0.0.2',
          bsnAPName: 'AP 02',
          bsnAPOperStatus: '2',
          cLApName: 'AP 02',
        },
        rrdGraphAttributes: {
          rszAPNumSta: {
            name: 'cLApAssocCount',
            relativePath: '',
            rrdFile: 'snmp:fs:Test:Node:ciscoAPMacAddress:6.0.0.0.0.0.2:cLApTable'
          }
        }
      }]
    }
  });

  // Initializing Controller

  createController(1, '.1.3.6.1.4.1.9.1.2370');
  httpBackend.flush();

  // Checking data

  console.debug('Start valitations...');
  expect(scope.loading).toEqual(false);
  expect(scope.title).toEqual('Cisco WLC Access Points');
  expect(scope.columns.length).toEqual(4);
  expect(scope.columns[0].name).toEqual('description');
  expect(scope.columns[1].name).toEqual('ipAddress');
  expect(scope.columns[2].name).toEqual('numStations');
  expect(scope.columns[3].name).toEqual('status');
  expect(scope.rows.length).toEqual(2);
  expect(scope.rows[0].description).toEqual('AP 01');
  expect(scope.rows[0].ipAddress).toEqual('10.0.0.1');
  expect(scope.rows[0].numStations).toEqual(1);
  expect(scope.rows[0].status).toEqual('Associated');
  console.debug('End validations.');
});
