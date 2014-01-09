(function () {
    "use strict";

    $.ajaxSetup({
        timeout: 3000
    });

    var stats = [],
        chart,
        table;

    function getUserName() {
        var deferred = new $.Deferred();

        deferred.notify('Fetching GitHub username.');

        $.get('https://github.com',function (data) {
            var name = $(data).find('#user-links .name').text().trim();

            if (name.length) {
                deferred.resolve(name);
            } else {
                deferred.reject('Failed fetching GitHub username. You are probably not logged in.');
            }
        }).fail(function () {
                deferred.reject('Failed fetching your GitHub username. Probably network issues or github.com is down.')
            });

        return deferred.promise();
    }

    function getUserRepos(name) {
        var deferred = new $.Deferred();

        deferred.notify('Fetching list of your repositories.');

        $.getJSON('https://api.github.com/users/' + name + '/repos',function (data) {
            if (data.length) {
                var output = [];

                for (var i = 0, l = data.length; i < l; i++) {
                    var repo = data[i];

                    output.push({
                        full_name: repo.full_name,
                        fork: repo.fork
                    });
                }

                deferred.resolve(output);
            } else {
                deferred.reject('It looks like you have no public repositories.');
            }
        }).fail(function () {
            deferred.reject('Failed fetching list of your public repositories. Probably network issues or GitHub API is down.');
        });

        return deferred.promise();
    }

    function getReposTraffic(arr) {
        var deferred = new $.Deferred();
        var promises = [];

        deferred.notify('Fetching analytics data for all repositories.');

        arr.forEach(function (repo) {
            promises.push($.getJSON('https://github.com/' + repo.full_name + '/graphs/traffic-data', addRepoTraffic.bind(null, repo)));
        });

        $.when.apply($, promises).then(function () {
            stats = stats.sort(function(a,b){
                return (a.views > b.views) ? -1 : 1;
            });

            deferred.resolve(stats);
        }, function () {
            deferred.reject('Failed fetching analytics data for your repositories. Probably network issues or GitHub blocked access to this data.');
        });

        return deferred.promise();
    }

    function addRepoTraffic(repo, data) {
        stats.push({
            key: repo.full_name,
            values: data.counts.map(function (item) {
                return {
                    y: item.total,
                    x: item.bucket
                };
            }),
            fork: repo.fork,
            views: data.summary.total,
            visitors: data.summary.unique
        });
    }

    function showChart(data) {
        nv.addGraph(function () {
            chart = nv.models.lineChart();
            var timeFormat = d3.time.format("%b %e");

            chart.xAxis
                .axisLabel('Time')
                .tickFormat(function (timestamp) {
                    return timeFormat(new Date(timestamp * 1000));
                });

            chart.yAxis.axisLabelDistance(50);

            chart.yAxis
                .axisLabel('Views')
                .tickFormat(d3.format(',r'));

            d3.select('#chart svg')
                .datum(data)
                .transition().duration(500)
                .call(chart);

            nv.utils.windowResize(function () {
                d3.select('#chart svg').call(chart)
            });

            return chart;
        });
    }

    function updateChart(data) {
        d3.select('#chart svg').datum(data).transition().duration(500).call(chart);
        nv.utils.windowResize(chart.update);
    }

    function showTable(data) {
            // the columns you'd like to display
            var columns = ["Name", "Fork", "Views", "Visitors"];

            table = d3.select("table");
            var thead = table.append("thead"),
                tbody = table.append("tbody");

            // append the header row
            thead.append("tr")
                .selectAll("th")
                .data(columns)
                .enter()
                .append("th")
                .text(function(column) { return column; });

            // create a row for each object in the data
            var rows = tbody.selectAll("tr")
                .data(data)
                .enter()
                .append("tr");

            // create a cell in each row for each column
            rows.selectAll("td")
                .data(function(repo) {
                    return [
                        {
                            column: "Name",
                            value: '<a href="https://github.com/' + repo.key + '/graphs/traffic">' + repo.key + '</a>'
                        },
                        {
                            column: "Fork",
                            value: repo.fork ? '✓' : ''
                        },
                        {
                            column: "Views",
                            value: repo.views
                        },
                        {
                            column: "Visitors",
                            value: repo.visitors
                        }
                    ];
                })
                .enter()
                .append("td")
                .html(function(d) { return d.value; });
    }

    function filterData(data, settings) {
        var output = data;

        if(settings.hideForks) {
            output = output.filter(function(item) {
                return !item.fork;
            });
        }

        if(settings.hideNoTraffic) {
            output = output.filter(function(item) {
                return item.values.length > 0;
            });
        }

        return output;
    }

    function hideProgressInfo() {
        $('#progress').delay(1000).fadeOut(function () {
            $(this).remove();
        });
    }

    function updateProgressInfo(type, msg) {
        var $p = $('<p>').text(msg).addClass('alert').addClass('alert-' + type);
        $('#progress').prepend($p);

        setTimeout(function () {
            $p.addClass('visible');
        }, 0);
    }

    getUserName()
        .then(getUserRepos)
        .then(getReposTraffic)
        .done(updateProgressInfo.bind(null, 'success', 'All data successful downloaded!'))
        .done(hideProgressInfo)
        .done(showChart)
        .done(showTable)
        .fail(updateProgressInfo.bind(null, 'danger'))
        .progress(updateProgressInfo.bind(null, 'info'));

    $('input').change(function() {
        updateChart(filterData(stats, {
            hideForks: $('#hideForks').is(':checked'),
            hideNoTraffic: $('#hideNoTraffic').is(':checked')
        }));
    });
})();