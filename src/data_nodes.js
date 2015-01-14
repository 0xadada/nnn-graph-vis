(function() {
    


    app.factory('NodeDataManager', function ($http,$rootScope,NodeData,NodeConnection) {

        var DATA_PARSED = 'NodeDataManager: DATA_PARSED';


        var NodeDataManager = function(scope)
        {

            this.nodesList = [];
            this.nodesHash = {};
            this.dataObj;
            this.scope = scope;
        }

        NodeDataManager.prototype.loadData = function(id)
        {

            var self = this;
            
            // load in the original network for BEAM to use as a backdrop
            $http.get('data/nara_boston.json').
            success(function(data, status, headers, config) {
              
              // store the default data set for eventual concatenation
              var data1 = data;
              
              // slice the BEAM data to be slightly more efficient during testing
              // data1 = data1.slice(0,3);

              // load in our new custom nodes
              $http.get('data/scenes/scene1.json').
              success(function(data, status, headers, config) {

                // prepare the custom data for concatenation
                data2 = data;
                var num_nodes = Object.keys(data2).length;
                
                // add fields to the custom data to make it compatible with BEAM
                for(i=0; i<num_nodes; i++) {
                    data2[i].attributes = new Array();
                    data2[i].number_of_attributes = 0;
                    data2[i].number_of_connections = Object.keys(data2[i].connections).length;
                }
                    
                // combine the existing data set with our custom data
                data3 = data1.concat(data2);
                num_nodes = Object.keys(data3).length;

                // parse it into a network
                self.dataObj = data3;
                self.parseNodeData();

              }).
              error(function(data, status, headers, config) {
              });
                
            }).
            error(function(data, status, headers, config) {
            });
        }

        NodeDataManager.prototype.parseNodeData = function() {
            var i=0;
            var limit = this.dataObj.length;
            for (i=0;i<limit;++i) {
                var node = new NodeData(this.dataObj[i]);
                this.nodesList.push(node);
                this.nodesHash[node.id] = node;
            }

            for (i=0;i<limit;++i) {
                //todo: connect and define connections.
                var node = this.nodesList[i];
                for (c=0;c<node.totalConnections;++c)
                {
                    var connectData = node.connections[c];
                    //console.log(connectData);// +'  '+this.nodesHash[connectData.connectionNode].attributes);
                    var connectNode = this.nodesHash[connectData.connectionNode];
                    if (connectNode !== undefined) {
                        var aLimit = connectNode.attributes.length;
                    }
                }
            }

            console.log('data parsed');
            this.scope.$emit(NodeDataManager.DATA_PARSED);
        }


        NodeDataManager.prototype.clearnodesList = function()
        {
            var i=0;
            var limit = this.nodesList.length;

            for (i=0;i<limit;++i) {
                this.nodesList[i].destroy();
            }
            this.nodesList = [];
            this.nodesHash = {};
        }

        NodeDataManager.prototype.getNodeByID = function(id)
        {
            return this.nodesHash[id];
        }

        NodeDataManager.prototype.getNodeList = function()
        {
            return this.nodesList;
        }

        NodeDataManager.prototype.getNodeHash = function()
        {
            return this.nodesHash;
        }
        return NodeDataManager;
    })



    /*app.factory('jsonData', function ($http) {
        var obj;// = $http.get('data/nnn_json_structure.json').success(successCallback)//$http.get('data/nnn_json_structure.json')
        //return obj;

        $http.get('data/nnn_json_structure.json').
        success(function(data, status, headers, config) {
          obj = data;
        }).
        error(function(data, status, headers, config) {
          // log error
        });
        return obj;
    })*/

    app.factory('NodeConnection', function ($http) {

        var NodeConnection = function(nodeID,data)
        {
            this.weight = data.weight*Math.random();
            this.initialNode = nodeID;
            this.connectionNode = data.id;
            this.connected = false;
            this.webGLConnection;
        }

        NodeConnection.prototype.destroy = function()
        {
            delete this.weight;// = null;
            delete this.initialNode;// = null;
            delete this.connectionNode;// = null;
            delete this.webGLConnection;
        }

        NodeConnection.prototype.getWeight = function()
        {
            return this.weight;
        }

        NodeConnection.prototype.getInitialNode = function()
        {
            return this.initialNode;
        }

        NodeConnection.prototype.getConnectionNode = function()
        {
            return this.connectionNode;
        }

        NodeConnection.prototype.isConnected = function(value)
        {
            if (value !== undefined)
            {
                this.connected = value;
            }
            return this.connected;
        }

        NodeConnection.prototype.setVisualConnection = function(obj)
        {
            this.webGLConnection = obj;
        }

        NodeConnection.prototype.getVisualConnection = function()
        {
            return this.webGLConnection;
        }



        return NodeConnection;
    })


    app.factory('NodeAttribute', function ($http) {

        var NodeAttribute = function(data,parent,tier,order)
        {

            this.visualNode = null;
            this.dataType = 'Attribute';
            this.parentNode = parent;
            this.fullBranchList = [];
            this.childAttributesList = [];
            this.childHash = {};
            this.tier = tier;
            this.order = order;


            // fullAttrList used to initiate search if key does not match nodes initial branch attributes increment by attr nodes fullChild

            if (typeof data === 'object')
            {
                this.name = Object.getOwnPropertyNames(data).toString();
                //console.log(this.name)
                //console.log(data);
                //console.log(data[this.name])
                var childAttributes = data[this.name];
                this.fullBranchList.push(this);
                var i=0;
                var limit = childAttributes.length;
                for (i=0;i<limit;++i)
                {
                    var attribute = new NodeAttribute(childAttributes[i],this,this.tier+1,i/limit)
                    this.childAttributesList.push(attribute);
                    this.fullBranchList.push(attribute);
                    this.childHash[attribute.getName()] = attribute;
                    this.fullBranchList = this.fullBranchList.concat(attribute.getFullBranchList())
                }

            }
            else
            {
                this.name = data;
                //console.log(this.name)
            }
            //console.log(this);
            return this;
            
        }

        NodeAttribute.prototype.destroy = function()
        {
            delete this.visualNode;// = null;
            delete this.fullBranchList;// = null;
            delete this.childAttributes;// = null;
            delete this.childHash;
            delete this.parentNode;
            delete this.tier;
        }

        NodeAttribute.prototype.getName = function()
        {
            return this.name;
        }

        NodeAttribute.prototype.getChildAttributes = function()
        {
            return this.childAttributes;
        }

        NodeAttribute.prototype.getChildHash = function()
        {
            return this.childHash;
        }

        NodeAttribute.prototype.getDataType = function()
        {
            return this.dataType;
        }

        NodeAttribute.prototype.getFullBranchList = function()
        {
            return this.fullBranchList;
        }

        NodeAttribute.prototype.getParent = function()
        {
            return this.parentNode;
        }

        NodeAttribute.prototype.getTier = function()
        {
            return this.tier;
        }

        NodeAttribute.prototype.getOrder = function()
        {
            return this.order;
        }

        NodeAttribute.prototype.getVisualNode = function()
        {
            return this.visualNode;
        }

        NodeAttribute.prototype.setVisualNode = function(node)
        {
            this.visualNode = node;
        }




        NodeAttribute.prototype.addAttribute = function(attribute)
        {
            var attribute = new Attribute(attribute,this.tier+1)
        }
/*
        var i=0;
            var limit = rootAttr.length;
            console.log(nodeData.name);
            for (i=0;i<limit;++i)
            {
                var att = rootAttr[i];
                var categoryName = Object.getOwnPropertyNames(att);
                console.log(categoryName);
                var attributeCategory = att[categoryName];
                var a=0;
                var aLimit = attributeCategory.length;
                for (a=0;a<aLimit;++a)
                {
                    console.log(attributeCategory[a])
                }
                //console.log('----');
                //console.log('___________')
            }
            console.log('=========================================');
*/
        return NodeAttribute;
    })




    app.factory('NodeData', function ($http,NodeConnection,NodeAttribute) {
        var NodeData = function(data) {
            this.id = data.id;
            this.name = data.node_name;
            this.type = data.node_type;
            this.dataType = 'Node';
            this.baseTexture = '';
            this.baseColor = '#ffffff';//#ccddff';//+Math.floor(Math.random()*16777215).toString(16);
            this.totalAttributes = data.number_of_attributes;
            this.totalConnections = data.number_of_connections;
            this.fullAttributesList = [];
            this.attributes = data.attributes;
            this.connections = [];
            this.connectionsHash = {};
            this.incomingConnections = [];
            this.incomingConnectionsHash = {};
            this.webGLNode = null;

            var i=0;
            var limit = this.totalConnections;
            for (i=0;i<limit;++i)
            {
                var nodeConnection = new NodeConnection(this.id,data.connections[i]);
                this.connectionsHash[data.connections[i].id] = nodeConnection;
                this.connections.push(nodeConnection);
                //todo: cross examine attributes to these connections.
            }

            limit = this.attributes.length;
            for (i=0;i<limit;++i)
            {
                var attribute = new NodeAttribute(this.attributes[i],this,0,i/limit);
                //console.log(attribute.getFullBranchList());
                
                this.fullAttributesList = this.fullAttributesList.concat(attribute.getFullBranchList());
                //console.log('------');//attribute.getChildAttributes())
            }
            //console.log(this.fullAttributesList);
            //console.log('-----------------------------------------------------')
        }

        NodeData.prototype.addFakeConnections = function(nodeList)
        {
            console.log('adding fake data')
            var i = 0;
            var limit = Math.random()*50;//nodeList.length;

            for (i=0;i<limit;++i)
            {
                var weight = Math.floor(Math.random()*4);
                var weights = [-1,-0.5,0.5,1];
                var connection = new NodeConnection(this.id,{id:Math.floor(Math.random()*nodeList.length),weight:weights[weight]});
                this.totalConnections++;
                this.connections.push(connection);
            }

        }

        NodeData.prototype.addConnection = function(connectionNodeID,weight)
        {
            var connection = new NodeConnection(this.id,{id:connectionNodeID,weight:weight});
            this.connections.push(connection);
            this.connectionsHash[connectionNodeID] = connection;
            this.totalConnections++;
        }

        NodeData.prototype.addIncomingConnection = function(connectionNodeID,weight)
        {
            var connection = new NodeConnection(connectionNodeID,{id:this.id,weight:weight});
            this.incomingConnections.push(connection);
            this.incomingConnectionsHash[connectionNodeID] = connection;
            return connection;
        }

        NodeData.prototype.destroy = function()
        {
            delete this.id;// = null;
            delete this.name;// = null;
            delete this.type;// = null;
            delete this.baseTexture;// = null;
            delete this.baseColor;// = null;
            delete this.totalAttributes;// = null;
            // = null;
            var i=0;
            var limit = this.totalConnections;
            for (i=0;i<limit;++i)
            {
                this.connections[i].destroy;
            }
            var i=0;
            var limit = this.fullAttributesList.length;
            for (i=0;i<limit;++i)
            {
                this.fullAttributesList[i].destroy;
            }
            delete this.totalConnections;
            delete this.attributes;// = null;
            delete this.connections;// = null;
            delete this.linkednodesListHash;// = null;
            delete this.visualNode;// = null;
        }


        NodeData.prototype.isLinkedToThisNode = function(nodeID)
        {
            //todo: check if is in hash, return result;
            return (connectionsHash[nodeID] !== undefined);
        }

        NodeData.prototype.getName = function()
        {
            return this.name;
        }

        NodeData.prototype.getDataType = function()
        {
            return this.dataType;
        }


        NodeData.prototype.getID = function()
        {
            return this.id;
        }

        NodeData.prototype.getType = function()
        {
            return this.type;
        }

        NodeData.prototype.getAttributes = function()
        {
            return this.attributes;
        }

        NodeData.prototype.getFullAttributesList = function()
        {
            return this.fullAttributesList;
        }

        NodeData.prototype.getConnectionByID = function(id)
        {
            return this.connectionsHash[id];
        }

        NodeData.prototype.getConnections = function()
        {
            //todo: retrieve linked data nodesList based on id;

            return this.connections;
        }

        NodeData.prototype.getIncomingConnections = function()
        {
            return this.incomingConnections;
        }

        NodeData.prototype.getIncomingConnectionByID = function(id)
        {
            return this.incomingConnectionsHash[id];
        }

        NodeData.prototype.checkConnection = function(id)
        {
            if (this.connectionsHash[id] === undefined) return false;
            return this.connectionsHash[id].isConnected()
            
        }

        NodeData.prototype.setVisualNode = function(obj)
        {
            this.visualNode = obj;
        }

        NodeData.prototype.getVisualNode = function()
        {
            return this.visualNode;
        }

        return NodeData;
    })

























    app.factory('NodeFactory', function (DataNode,AdvDataNode) {

        this.createAdvNode = function (userName)
        {
            return new AdvDataNode(userName);
        }

        this.createNode = function (userName)
        {
            return new DataNode(userName);
        }





        return {
            createNode : this.createNode,
            createAdvNode : this.createAdvNode
            // create : function (userName) {
            //     return new AdvDataNode(userName);
            // }
        };
    })









    app.factory('DataNode', function ($http) {
        var apiUrl = 'https://api.github.com/';

        // instantiate our object
        var DataNode = function (username) {
            this.username = username;
            this.profile = null;
        };
        // this method will fetch data from GH API and return a promise
        DataNode.prototype.getProfile = function () {
            // Generally, javascript callbacks, like here the $http.get callback, change the value of the "this" variable inside callbacks so we need to keep a reference to the current instance "this", and we do it with the following :
            var self = this;
            return $http.get(apiUrl + 'users/' + this.username).then(function (response) {
                // we store the API result in user.profile. 
                self.profile = response.data
                // promises success should always return something in order to allow promise  chaining
                return response;
            });
        };
        return DataNode;
    })





    // we inject our original service so we can extend it properly
    app.factory('AdvDataNode', function ($http, DataNode) {
        var apiUrl = 'https://api.github.com/';

        // instantiate our custom object with original object constructor
        var AdvDataNode = function (username) {
            DataNode.apply(this, arguments);
        };

        // duplicate the original object prototype
        AdvDataNode.prototype = new DataNode();

        // define a new internal method for this object
        function getUserEvents() {
            var self = this;
            return $http.get(apiUrl + 'users/' + this.username + '/events').then(function (response) {
                self.profile.events = response.data;
                return response;
            });
        }
        // we'll override our original getProfile
        AdvDataNode.prototype.getProfile = function () {
            // first call the original getProfile method
            var originalGetProfile = DataNode.prototype.getProfile.apply(this, arguments);
            // then once profile fetched, add some more user data
            var self = this;
            return originalGetProfile.then(function () {
                // call our private method, binding "this" to "self";
                return getUserEvents.call(self);
            });
        };
        return AdvDataNode;
    })

})();