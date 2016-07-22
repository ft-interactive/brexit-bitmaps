'use strict';
var d3 = require('d3'); //remove this line if you don't care about ES6 pollyfils
var dataRoot = 'https://ft-ig-brexit-polling.herokuapp.com';
var shortIsoFormat = d3.time.format('%Y-%m-%d');
var backgroundColour = 'FFF1E0';

d3.json(dataRoot+'/data.json', function(data){
    d3.select('select#polls-dropdown').selectAll('option')
        .data( data.data.reverse() )
            .enter()
        .append('option')
            .attr({
                selected:function(d,i){ 
                    if(i==0){
                        return 'selected';
                    }
                    return;
                },
                value:function(d){
                    return [d.pollster,shortIsoFormat(new Date(d.date))]
                } // e.g. ComRes,2015-12-11
            })
            .text(function(d){
                return d.remain + '% 🇪🇺 vs ' + d.leave + '% 🇬🇧 ' + ' ('+shortIsoFormat(new Date(d.date))+', '+d.pollster+')'; 
            });
            
    d3.select('select#polls-dropdown').on('change', updateIndividualPolls);
    updateIndividualPolls();
    
    updatePollOfPolls();
    
    //set the extents of the calendar pickers
    var ext = d3.extent(data.data, function(d){
        return d.date;
    }).map(function(d){
           return shortIsoFormat(new Date(d));
    });
    
    ext[1] = shortIsoFormat(new Date());
    
    d3.select('input[name="start"]').attr( 'value', ext[0] ).on('change', updateTimeSeries);
    d3.select('input[name="end"]').attr( 'value', ext[1] ).on('change', updateTimeSeries);
    //some default time domains
    
    var now = new Date(),
        referendumDate = shortIsoFormat( new Date(2016, 7, 15) ),
        oneYearAgo = shortIsoFormat(new Date(now.getFullYear()-1, now.getMonth(), now.getDate())),
        sixMonthsAgo = shortIsoFormat(new Date(now.getFullYear(), now.getMonth()-6, now.getDate())),
        generalElection = shortIsoFormat(new Date(2015, 5, 0));
    now = shortIsoFormat(now);
    
    var defaultDomains = [
        {
            label:'last year',
            domain:['year' ,'now']
        },
        {
            label:'last 6 months',
            domain:['6-months', 'now']
        },
        {
            label:'since the last election',
            domain:['election-2015', 'now']
        }//,
        // {
        //     label:'from the election to the referendum',
        //     domain:['election-2015', referendumDate]
        // }
    ];
    
    d3.select('#default-time-inputs')
        .selectAll('a').data(defaultDomains)
            .enter()
        .append('span').classed('date-range-option',true)
        .append('a')
            .attr({
                'data-start':function(d){ return d.domain[0]; },
                'data-end':function(d){ return d.domain[1]; },
                'href':'#'
            })
            .text(function(d){ return d.label; })
            .on('click',function(d){
                // d3.select('input[name="start"]').attr('value', d.domain[0] );
                // d3.select('input[name="end"]').attr('end', d.domain[1] );
                console.log(d.domain);
                d3.event.preventDefault();
                updateTimeSeries(d.domain[0], d.domain[1]);
            });
            
    updateTimeSeries('year','now');
});

function updateTimeSeries(start, end){
    //get the dates
    if(!start){
        start = d3.select('input[name="start"]').node().value;
    }
    if(!end){
        end = d3.select('input[name="end"]').node().value;
    }
    
    console.log([start, end]);
    
    function svgPath(d){
        return dataRoot + '/polls/' + [start,end] + '/' + d.join('-x-') + '-' + backgroundColour + '.svg';
    }
    
    function fileName(d){
        return 'polls ' + (start) + ' to ' + (end) + ' ' + d.join('-x-');
    }

    d3.selectAll('.time-series .poll-chart div').remove();
    d3.selectAll('.time-series .poll-chart')
        .selectAll('object')
            .data([ [600,500],[300,300] ])
        .enter()
            .call(function(parent){
                var container = parent.append('div').attr('class', 'container');
                container.append('canvas')
                    .attr({
                        id:function(d){ return 'timeseries-'+d.join('-x-')},
                        width:function(d){ return d[0]; },
                        height:function(d){ return d[1]; }
                    }).each(function(d){
                        canvg('timeseries-'+d.join('-x-'), svgPath(d) )                        
                    });
                
                container.append('p').append('a')
                    .attr('href', svgPath)
                    .text(' download .SVG ');
                
                container.append('p').append('a')
                     .attr({
                        'href':'#',
                        'download':fileName
                    })
                    .on('click',function(d){
                        d3.select(this)
                            .attr('href', d3.select('#timeseries-'+d.join('-x-')).node().toDataURL()) //replace the href with the datURL
                    })
                    .text(' download .PNG ');
            })

    
}

function updatePollOfPolls(){
        d3.selectAll('.average .poll-chart div').remove();
        
        function svgPath(d){
            return dataRoot + '/poll-of-polls/' + d.join('-x-')+ '-' + backgroundColour + '.svg';
        }
        function fileName(d){
            return 'poll-of-polls,' + d.join('-x-');
        }
        function canvasID(d){ 
            return 'poll-of-polls'+d.join('-x-');
        }
        
        d3.selectAll('.average .poll-chart div').remove();
        d3.select('.average .poll-chart')
            .selectAll('object')
                .data( [[600,75], [300,75]] )
            .enter()
                .call(singlePoll, svgPath, canvasID, fileName);
     
}

function updateIndividualPolls(){
    var value = d3.select('select#polls-dropdown').node().value;
    function svgPath(d){
        return dataRoot + '/poll/' + value.replace(/\//, '-') + '/' + d.join('-x-') + '-' + backgroundColour + '.svg';
    }
    
    function fileName(d){
        return 'poll-' + value + ',' + d.join('-x-');
    }
    function canvasID(d){ 
        return 'poll-'+d.join('-x-')
    }
     
    d3.selectAll('.individual .poll-chart div').remove();
    d3.select('.individual .poll-chart')
        .selectAll('object')
            .data( [[600,75], [300,75]] )
        .enter()
            .call(singlePoll, svgPath, canvasID, fileName);
}

function singlePoll(parent, svgPath, canvasID, fileName){
    var container = parent.append('div').attr('class', 'container');

    container.append('canvas')
        .attr({
            id:canvasID,
            width:function(d){ return d[0]; },
            height:function(d){ return d[1]; }
        }).each(function(d){
            var ctx = this.getContext('2d')
                ctx.fillStyle = "#AAAAAA";
                ctx.fill();
            canvg( canvasID(d), svgPath(d) );                     
        });
    
    container.append('p').append('a')
        .attr({
            'href':svgPath,
            'download':fileName
        })
        .text(' download .SVG ');
    
    container.append('p').append('a')
        .attr({
            'href':'#',
            'download':fileName
        })
        .on('click',function(d){
            d3.select(this)
                .attr('href', function(f){
                        return d3.select('#'+ canvasID(f)).node().toDataURL();
                }) //replace the href with the datURL
        })
        .text(' download .PNG ');
}