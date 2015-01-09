(function() {

    app.factory('ColorManager', function ($http) {

        var ColorManager = function(scope) {
            this.backgroundSceneColor = 0x2f0f32;
            this.backgroundSceneAmbientColor = 0x000000;
            this.backgroundSceneSpecularColor = 0x000000;
            this.backgroundSceneShininess = 0.1;


            this.fogColor = 0x2f0f32;//this.backgroundSceneColor;//0xb4285c;   // scene fog base color;
            this.fogCycleColor = 0x230745;
            this.networkMeshColor = 0xee88dd; // base color of background network mesh lines
            this.networkMeshColor = 0xffffff; // base color of background network mesh lines

            // Light Sources
            this.ambientLightColor = 0x2f0f32; // overall color that is cast onto all objects that have  a mesh light reflective surface.
            this.activeNodeLightColor = 0xffffff;  // color of light that sits inside the currently active node
            this.cameraLightColor = 0xffffff; // color of light that follow camera
            this.cameraLightIntensity = 1.5; // brightness of camera light;
            this.centralLightColor = 0x453434;  // color of light that sits in the center of the universe

            this.nodeParticleBaseColor = 0xffffff;  // base color for all fake nodes, will tint particle sprites this color 
            this.userNodeBaseColor = 0x304c58;//0xf0924b;
            this.userNodeAmbientColor = 0x68a0b9;//0xf0934b;
            this.userNodeSpecularColor = 0xd8e7ee;//0xff7104;
            this.userNodeShineValue = 1;
            this.userNodeGlowColor = 0x00aaff;

            this.entityNodeBaseColor = 0xf0924b;
            this.entityNodeAmbientColor = 0xf0934b;
            this.entityNodeSpecularColor = 0xff7104;
            this.entityNodeShineValue = 10;
            this.entityNodeGlowColor = 0xffffff;//ffaa00;

            this.attributeHighlightColor = '0xff0000'; // color that attributes change to on rollover
            this.attributeGlowColor = 0xffffff;
            this.attributeConnectionColor = '0xffffff'; // overwritten by texture map currently.
            this.attributeColor = '0xffffff'


            this.connectionSparkGlowColor = 0xffffff;
            this.simpleConnectionColor = '#0xee88dd';//'#2e1519';
            this.pulseConnectionColor = '#0xee88dd';
            // texture colors
        }



        ColorManager.prototype.getBackgroundSceneColor = function() {
            return this.backgroundSceneColor;
        }

        ColorManager.prototype.getBackgroundSceneAmbientColor = function() {
            return this.backgroundSceneAmbientColor;
        }

        ColorManager.prototype.getBackgroundSceneSpecularColor = function() {
            return this.backgroundSceneSpecularColor;
        }

        ColorManager.prototype.getBackgroundSceneShininess = function() {
            return this.backgroundSceneShininess;
        }

        ColorManager.prototype.getFogColor = function() {
            return this.fogColor;
        }

        ColorManager.prototype.getFogCycleColor = function() {
            return this.fogCycleColor;
        }

        ColorManager.prototype.getNetworkMeshColor = function() {
            return this.networkMeshColor;
        }

        ColorManager.prototype.getActiveNodeLightColor = function() {
            return this.activeNodeLightColor;
        }

        ColorManager.prototype.getAmbientLightColor = function() {
            return this.ambientLightColor;
        }

        ColorManager.prototype.getCameraLightColor = function() {
            return this.cameraLightColor;
        }

        ColorManager.prototype.getCameraLightIntensity = function() {
            return this.cameraLightIntensity;
        }

        ColorManager.prototype.getCentralLightColor = function() {
            return this.centralLightColor;
        }

        ColorManager.prototype.getAttributeColor = function() {
            return this.attributeColor;
        }

        ColorManager.prototype.getAttributeConnectionColor = function() {
            return this.attributeConnectionColor;
        }

        ColorManager.prototype.getAttributeHighlightColor = function() {
            return this.attributeHighlightColor;
        }

        ColorManager.prototype.getAttributeGlowColor = function() {
            return this.attributeGlowColor;
        }

        ColorManager.prototype.getNodeParticleBaseColor = function() {
            return this.nodeParticleBaseColor;
        }

        ColorManager.prototype.getEntityNodeBaseColor = function() {
            return this.entityNodeBaseColor;
        }

        ColorManager.prototype.getEntityNodeAmbientColor = function() {
            return this.entityNodeAmbientColor;
        }

        ColorManager.prototype.getEntityNodeSpecularColor = function() {
            return this.entityNodeSpecularColor;
        }

        ColorManager.prototype.getEntityNodeShineValue = function() {
            return this.entityNodeShineValue;
        }

        ColorManager.prototype.getEntityNodeGlowColor = function() {
            return this.entityNodeGlowColor;
        }

        ColorManager.prototype.getUserNodeBaseColor = function() {
            return this.userNodeBaseColor;
        }

        ColorManager.prototype.getUserNodeAmbientColor = function() {
            return this.userNodeAmbientColor;
        }

        ColorManager.prototype.getUserNodeSpecularColor = function() {
            return this.userNodeSpecularColor;
        }

        ColorManager.prototype.getUserNodeShineValue = function() {
            return this.userNodeShineValue;
        }

        ColorManager.prototype.getUserNodeGlowColor = function() {
            return this.userNodeGlowColor;
        }

        ColorManager.prototype.getConnectionSparkGlowColor = function() {
            return this.connectionSparkGlowColor;
        }

        ColorManager.prototype.getSimpleConnectionColor = function() {
            return this.simpleConnectionColor;
        }

        ColorManager.prototype.getPulseConnectionColor = function() {
            return this.pulseConnectionColor;
        }

        return ColorManager;
    })


})();
