"use strict";

var stats = [];

function getUserName() {
    var deferred = new $.Deferred();

    $.get('https://github.com', function(data) {
        var name = $(data).find('#user-links .name').text().trim();

        if(name.length) {
            deferred.resolve(name);
        } else {
            deferred.reject();
        }
    });

    return deferred.promise();
}

function getUserRepos(name) {
    var deferred = new $.Deferred();

    $.getJSON('https://api.github.com/users/' + name + '/repos', function(data) {
        var names = [];

        for(var i = 0, l = data.length; i<l; i++) {
            var repo = data[i];

            names.push(repo.full_name);
        }

        deferred.resolve(names);
    });

    return deferred.promise();
}

function getReposTraffic(arr) {
    var deferred = new $.Deferred();
    var promises = [];

    arr.forEach(function(item) {
        promises.push($.getJSON('https://github.com/' + item +  '/graphs/traffic-data', addRepoTraffic.bind(null, item)));
    });

    $.when.apply($, promises).then(function(schemas) {
        deferred.resolve();
    }, function() {
        deferred.reject();
    });

    return deferred.promise();
}

function addRepoTraffic(repo, data) {
        stats.push({
            key: repo,
            values: data.counts.map(function(item) {
                return {
                    y: item.total,
                    x: item.bucket
                };
            })
        });
}

function showChart() {
    nv.addGraph(function() {
        var chart = nv.models.lineChart();
        var format = d3.time.format("%d-%m");

        chart.xAxis
            .axisLabel('Time')
            .tickFormat(function(timestamp) {
                return format(new Date(timestamp * 1000));
            });

        chart.yAxis
            .axisLabel('Views')
            .tickFormat();

        d3.select('#chart svg')
            .datum(stats)
            .transition().duration(500)
            .call(chart);

        nv.utils.windowResize(function() { d3.select('#chart svg').call(chart) });

        return chart;
    });
}

getUserName().then(getUserRepos).then(getReposTraffic).done(showChart).fail(function() {
    console.error('Something failed');
});