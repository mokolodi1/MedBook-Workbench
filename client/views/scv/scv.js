 
/*****************************************************************************/
/* Scv: Event Handlers and Helpersss .js*/
/*****************************************************************************/
Template.Scv.events({
  /*
   * Example:
   *  'click .selector': function (e, tmpl) {
   *
   *  }
   */
});

Template.Scv.helpers({
  /*
   * Example:
   *  items: function () {
   *    return Items.find();
   *  
   */
  sampleGroups: function(g1,g2) {
	  console.log('find sampleGroups:',g1,' ',g2)
  	return SampleGroups.find({group: g1});
	}
});

/*****************************************************************************/
/* Scv: Lifecycle Hooks */
/*****************************************************************************/
Template.Scv.created = function () {
};

Template.Scv.rendered = function () {
};

Template.Scv.destroyed = function () {
};


