/*****************************************************************************/
/* Cohort: Event Handlers and Helpers .js*/
/*****************************************************************************/
Template.Cohort.events({
    /*
     * Example:
     *  'click .selector': function (e, tmpl) {
     *
     *  }
     */
    'change #geneset' : function(event, template) {
        // The cookie stores genes required by obs-deck in case they might be missing from the geneset.
        // For example, if user has done sample sorting based on a gene expression, that gene expression data must be present.
        var cookieGenes = getCookieEvents();
        console.log('cookieGenes', cookieGenes);

        var sourceElem = event.target || event.srcElement;
        var elemValue = sourceElem.value;

        var genesetName = '';
        for (var i = 0; i < sourceElem.length; i++) {
            var option = sourceElem[i];
            if (option.selected) {
                // option element text also contains set size
                genesetName = (option.text);
                var fields = genesetName.split(" (");
                fields.pop();
                genesetName = fields.join();
                break;
            }
        }

        Session.set('geneset', genesetName);
        console.log('SESSION genesetName:', Session.get('geneset'));

        Session.set('geneList', cookieGenes.concat(elemValue.split(',')));
        console.log('SESSION geneset members', Session.get('geneList').length, 'genes', Session.get('geneList'));

        // TODO throw away pivot settings
        delete Session.keys['pivotSettings'];
        console.log('SESSION pivotSettings', Session.get('pivotSettings'));
    },
    'click .select_geneset' : function() {
        console.log('event: click .select_geneset');
    }
});

Template.Cohort.helpers({
    /*
     * Example:
     *  items: function () {
     *    return Items.find();
     *  }
     */
    genesets : function() {
        var genesetsResp = GeneSets.find({}, {
            reactive : true
        });
        var genesetsDocList = genesetsResp.fetch();

        var result = [];
        for (var i = 0; i < genesetsDocList.length; i++) {
            var doc = genesetsDocList[i];
            var name = doc['name'];
            var members = doc['members'];
            result.push({
                'name' : name,
                'members' : members,
                'size' : members.length
            });
        }
        return result;
    },
    selected : function() {
        var geneSetObj = this;
        var sessionGeneSet = Session.get('geneset');
        if (sessionGeneSet === geneSetObj.name) {
            return true;
        } else {
            return false;
        }
    },
});

/*****************************************************************************/
/* Cohort: Lifecycle Hooks */
/*****************************************************************************/
Template.Cohort.created = function() {
};

Template.Cohort.rendered = function() {
    var divElem = document.getElementById("Cohort_OD_Div");

    /**
     * Uses information in Session object to get the correct page of mongo documents from the specified collection.
     * This one only works when each obs-deck feature corresponds to just one document in the collection.
     * @param {Object} collectionObj as defined in /both/collections/*.js
     * @param {Object} datatypeName as defined in obs-deck plugin
     */
    var getPagedCollectionDocList = function(collectionObj, datatypeName) {
        var pagingSessionKey = "subscriptionPaging";
        var pageSize = 5;

        var pagingConfig = Session.get(pagingSessionKey) || {};
        var configKey = datatypeName;
        var pagingObj;
        if ( configKey in pagingConfig) {
            pagingObj = pagingConfig[configKey];
        } else {
            pagingObj = {
                "head" : 0,
                "tail" : 0
            };
        }

        var totalCount = collectionObj.find({}, {
            reactive : false
        }).count();

        var totalNumPages = Math.ceil(totalCount / pageSize);
        console.log("totalNumPages", totalNumPages);

        // be careful of off-by-one bugs
        if (pagingObj["head"] > totalNumPages - 1) {
            console.log('attempting to pass last page of documents - going back to last page');
            pagingObj["head"] = totalNumPages - 1;
            Session.set(pagingSessionKey, pagingConfig);
        }

        var resp = collectionObj.find({}, {
            skip : (pageSize * pagingObj["head"]),
            limit : pageSize,
            reactive : true
        });
        var docList = resp.fetch();

        return docList;
    };

    var getExpressionDocList = function() {
        return getPagedCollectionDocList(Expression2, "expression data");
    };

    // Deps.autorun is triggered when reactive data source has changed
    Deps.autorun(function() {
        var s = ' <-- Deps.autorun in cohort.js';
        // console.log('Deps.autorun');

        // TODO getting default signature for a contrast
        var contrastId = Session.get('selectedContrast');
        console.log('contrastId', contrastId, s);
        if (contrastId) {
            var contResp = Contrast.findOne({
                "_id" : contrastId
            });
            console.log('contResp', contResp, s);

            // TODO get the default sig.
        } else {
            console.log('NO CONTRAST ID', s);
        }

        // pivoting with correlator
        var corrResp = Correlator.find({}, {
            // sort : {
            // score : -1
            // },
            reactive : true
        });
        var corrDocList = corrResp.fetch();
        console.log('corrDocList.length:', corrDocList.length, s);

        var pivotSettings = Session.get('pivotSettings');
        if (pivotSettings) {
            console.log('pivotSettings', pivotSettings, s);
            var pName = pivotSettings['name'];
            var pDatatype = pivotSettings['datatype'];
            var pVersion = pivotSettings['version'];

            var geneList = [];
            var signatureNames = [pName + "_v" + pVersion];
            for (var i = 0; i < corrDocList.length; i++) {
                var doc = corrDocList[i];
                if (i == 0) {
                    console.log('doc', doc, s);
                }
                if ((doc['name_1'] === pName) && (doc['datatype_1'] === pDatatype) && ("" + doc['version_1'] === "" + pVersion)) {
                    // matched pivot event

                    if (u.endsWith(doc['name_2'], "_tf_viper")) {
                        // matched event is a signature
                        var name = doc['name_2'].replace("_tf_viper", "");
                        name = "tf_viper_" + name;
                        signatureNames.push(name + "_v" + "4");
                    } else if (doc['datatype_2'] === 'signature') {
                        // matched event is a signature
                        signatureNames.push(doc['name_2'] + "_v" + doc['version_2']);
                    } else if (doc['datatype_2'] === 'expression') {
                        // matched event is a gene
                        geneList.push(doc['name_2']);
                    }
                }
            }

            // TODO paging

            console.log('geneList', geneList, s);
            console.log('signatureNames', signatureNames, s);

            Session.set('geneset', 'from pivotSettings');
            Session.set('geneList', geneList);
            Session.set('signatureNames', signatureNames);

        } else {
            console.log('NO PIVOTSETTINGS FROM SESSION', pivotSettings, s);

            // when this is empty, no pivot data is sent to obs-deck
            corrDocList = [];

            Session.set('signatureNames', ['MAP3K8_kinase_viper_v4']);
        }

        // get clinical data
        var clinResp = ClinicalEvents.find({}, {
            reactive : true
        });
        var clinDocList = clinResp.fetch();
        console.log('clinDocList.length:', clinDocList.length, s);

        // get expression data

        // var geneSet = Session.get('geneset');
        // var geneList = Session.get('geneList');
        // console.log('geneSet', geneSet, 'geneList', geneList, s);

        var expDocList = getExpressionDocList();
        console.log('expDocList.length:', expDocList.length, s);

        // TODO get signature gene:weight vectors + metadata
        var signatureScoresResp = SignatureScores.find({});
        var signatureScoresDoclist = signatureScoresResp.fetch();
        console.log('signatureScoresDoclist.length:', signatureScoresDoclist.length, s);

        // TODO signature indexes
        var sigIdxResp = Signature.find({}, {
            reactive : true
        });
        var sigIdsDocList = sigIdxResp.fetch();
        console.log('sigIdsDocList.length:', sigIdsDocList.length, s);

        // build observation deck
        if ((clinDocList.length > 0) || (expDocList.length > 0)) {
            od_config = buildObservationDeck(divElem, {
                // gene query service -> http://localhost:3000/genes?q=MAPK
                "geneQueryUrl" : "/genes?q=",
                'pivotScores' : {
                    'object' : corrDocList
                },
                'mongoData' : {
                    'clinical' : clinDocList,
                    'expression' : expDocList
                },
                'signature' : {
                    'expression' : {
                        'object' : [signatureScoresDoclist]
                    }
                },
                'signature_index' : {
                    'expression' : {
                        'object' : sigIdsDocList
                    }
                },
                "rowTitleCallback" : function(eventId, config) {
                    var eventObj = config['eventAlbum'].getEvent(eventId);
                    var datatype = eventObj.metadata['datatype'];
                    if (datatype === 'expression data') {
                        // mRNA url: /wb/gene/<gene name>
                        var gene = eventId.replace('_mRNA', '');
                        var url = '/wb/gene/' + gene;
                        window.open(url, "_self");
                    } else if (datatype === 'clinical data') {
                        // clinical url: /wb/clinical/<name>
                        var feature = eventId;
                        var url = '/wb/clinical/' + feature;
                        window.open(url, "_self");
                    }
                },
                "columnTitleCallback" : function(sampleId, config) {
                    var url = '/wb/patient/' + sampleId;
                    window.open(url, "_self");
                }
            });
        } else {
            // remove child elements of divElem
            while (divElem.firstChild) {
                divElem.removeChild(divElem.firstChild);
            }
            divElem.innerHTML = 'no data';
        }

    });
};

Template.Cohort.destroyed = function() {
};

