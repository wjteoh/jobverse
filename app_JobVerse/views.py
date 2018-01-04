import os
from app_JobVerse import app_Isc
from flask import Blueprint, render_template, jsonify, request, url_for, redirect, Markup
import numpy as np
import pandas as pd
import json
import csv
from collections import Counter
from time import time


# Load data from data directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # refers to application_top
DATA_DIR = os.path.join(BASE_DIR, 'data/')
data_dist2H = np.load(DATA_DIR + "2Hdist_mtx.npy")
data_dist1H = np.load(DATA_DIR + "1Hdist_mtx.npy")
data_dist = np.load(DATA_DIR + "master_dist_mtx.npy")

title_id_f = pd.read_csv(DATA_DIR + 'titles_index.csv', keep_default_na=False)
t_dict = dict(zip(title_id_f.id, title_id_f.title_name))
id_t_dict = dict(zip(title_id_f.title_name, title_id_f.id))
title_list = title_id_f.title_name.tolist()
title_id_list = title_id_f.id.tolist()

title_df = pd.read_csv(DATA_DIR + 'parsed_titles.csv', keep_default_na=False)
positions = dict(zip(title_df.title, title_df.position))
domains = dict(zip(title_df.title, title_df.domain))
functions = dict(zip(title_df.title, title_df.pri_func))

jobpost_df = pd.read_csv(DATA_DIR + 'doc_index_filter.csv', keep_default_na=False)

category_nodes_df = pd.read_csv(DATA_DIR + '/Relational/word2vect_category/node_word2vec_1.csv', keep_default_na=False)
category_links_df = pd.read_csv(DATA_DIR + '/Relational/word2vect_category/edge_word2vec_1.csv', keep_default_na=False)
cat_label_dict = dict(zip(category_nodes_df.id, category_nodes_df.title))
cat_label_id_dict = dict(zip(category_nodes_df.title, category_nodes_df.id))


@app_Isc.route('/old/')
@app_Isc.route('/old/job/')
def home_old():
    return render_template("jobverse_homepage_old.html", ac_list=title_list)


@app_Isc.route('/')
@app_Isc.route('/job/')
def home():
    return render_template("jobverse_homepage.html", ac_list=title_list)


@app_Isc.route('/searchJob/', methods=['POST', 'GET'])
def jobTitleSearchForm():
    jobtitle = ''
    if request.method == 'POST':
        jobtitle = request.form['titlename'].title()
        print "Enter Form :", jobtitle
    return redirect(url_for('newjobGraph', jobtitle=jobtitle))


@app_Isc.route('/job/<path:jobtitle>')  #new url naming convention
def newjobGraph(jobtitle):
    return render_template("jobtitle_analysis.html", job_title=jobtitle, ac_list=title_list)


# temporary bar chart: popular jobtitles
@app_Isc.route('/job/popular/')  #new url naming convention
def popularJobsHTML():
    return render_template("jobtitle_analysis_popularjobs_barchart.html", ac_list=title_list)


# temporary bar chart: popular jobtitles
@app_Isc.route('/data/job/popular/') #for relationBipartite_Chord.html: skills bar chart
def getpopularJobsDATA():
    title_all = jobpost_df.title.tolist()
    job_count = Counter(title_all).most_common()  # most_common takes int param for max number of words
    job_count_df = pd.DataFrame(job_count, columns=['title', 'count'])
    # job_count_df.to_csv(DATA_DIR + '/Relational/jobtitle_frequency(2015).csv', index=False)

    job_count_data = list(
        job_count_df.apply(lambda row: {"name": row['title'], "value": row['count']}, axis=1))
    jsonSkills = json.dumps(job_count_data)
    return jsonify(job_count_data)


@app_Isc.route('/data/job/<path:jobtitle>')
def getNetworkData(jobtitle):
    startJOB = time()
    
    # SETTINGS
    verbose = True;  # Disable for NON-detail printing in terminal

    nSkilleachJob = 10
    nDispayedJobs = 35
    # SETTINGS-END

    jobtitle = jobtitle.title()
    
    titles_master_list = []
    t_id = id_t_dict[jobtitle]
    rowarr = data_dist[t_id]
    nnzero = np.nonzero(rowarr)[0].tolist()
    k = nDispayedJobs  # Number of nodes to show on screen
    if len(nnzero) > k:

        rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
        rowarr_copy = np.asarray(rowarr_l)
        zerosI = np.where(rowarr_copy == 0)[0]
        rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

        # Arrange n-smallest values to left of k
        k_most_similar = np.argpartition(rowarr_copy, k)
        sampleID = k_most_similar[:k]  # Return indices of smallest values

        n = k
    else:
        sampleID = nnzero
        n = len(nnzero)
    if verbose:
        print "Nonzeros found: {}".format(len(nnzero))

    if n == 0:
        print "JSON not saved: ", jobtitle
        return jsonify("")

    onehopall = np.nonzero(data_dist1H[t_id])[0].tolist()
    onehopI = list(set(sampleID) & set(onehopall))

    # Differentiate onehop similar by dom/func =(1 or 2) or twohop =(3)
    if functions[jobtitle] == "":  # Similar by domain
        for oneHop in onehopI:
            titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 2])
    if domains[jobtitle] == "":  # Similar by function
        for oneHop in onehopI:
            titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 1])
    else:
        for oneHop in onehopI:
            if domains[jobtitle] == domains[t_dict[oneHop]]:
                titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 2])
            else:
                titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 1])

    twohopall = np.nonzero(data_dist2H[t_id])[0].tolist()
    twohopI = list(set(sampleID) & set(twohopall))

    for twoHop in twohopI:
        titles_master_list.append([jobtitle, t_dict[twoHop], 1 - data_dist[t_id, twoHop], 3])
    # Connections between 1H & 2H
    for oneHop in onehopI:
        p2H = np.nonzero(data_dist1H[oneHop])[0].tolist()
        connected_t2 = list(set(p2H) & set(twohopI))
        if connected_t2:
            for t2 in connected_t2:
                titles_master_list.append([t_dict[oneHop], t_dict[t2], 1 - data_dist[oneHop, t2], 12])

    if verbose:
        print "Title:", jobtitle
        print "{} sampled titles".format(n)
        print "Total 1H in sample: {}".format(len(onehopI))
        print "Total 2H in sample: {}".format(len(twohopI))

    nw_data = pd.DataFrame(titles_master_list, columns=['t1', 't2', 'similarity', 'hop_num'])
    nw_data.drop_duplicates(['t1', 't2'])
    nw_data.sort_values(['similarity'], ascending=False, inplace=True)
    nw_data.reset_index(level=0, drop=True)

    if verbose:
        h2_df = nw_data[nw_data['hop_num'] == 3]
        h1_dom_df = nw_data[nw_data['hop_num'] == 2]
        h1_func_df = nw_data[nw_data['hop_num'] == 1]
        total2Ht = h2_df.shape[0]
        total1Ht = h1_func_df.shape[0] + h1_dom_df.shape[0]
        print "2-Hop title count: ", total2Ht
        print "1-Hop title count: ", total1Ht
        print "Total similar titles from {}: {}".format(jobtitle, total1Ht + total2Ht)
        print "Total number of edges: ", (nw_data.shape[0] - total2Ht)

    dataframe = nw_data


    dataframe.rename(columns={"t1": "source", "t2": "target"}, inplace=True)

    # Need to change here
    one_hFunc = dataframe['hop_num'] == 1  # same function
    one_hDom = dataframe['hop_num'] == 2  # same domain
    two_h = dataframe['hop_num'] == 3  # two hop
    # contains hop_num == 3 and 
    df_w_13H = dataframe[one_hFunc | one_hDom | two_h]
    # New data frame taking 1 & 2 = DF
    one_two_h = dataframe['hop_num'] == 12

    hop2_target_names = set(dataframe[two_h].target.tolist())
    hop12_target_names = set(dataframe[one_two_h].target.tolist())
    two_h_filter_list = list(hop2_target_names - hop12_target_names)

    two_h_tmp = dataframe[two_h].copy()
    two_h_filter = two_h_tmp['target'].isin(two_h_filter_list)

    # Check if only consist of 2-Hop
    hopnum = df_w_13H.hop_num.unique()
    if len(hopnum) == 1 and hopnum[0] == 3:
        drawing_df = dataframe[two_h]  # Draw only 2-Hop links
    else:
        # drawing_df = dataframe[one_hFunc | one_hDom | one_two_h]
        # drawing_df = dataframe[one_hFunc | one_hDom | one_two_h | two_h_filter]
        drawing_df = dataframe[one_hFunc | one_hDom | two_h]

    unique_t = pd.Index(df_w_13H['source'].append(df_w_13H['target']).reset_index(drop=True).unique())

    # unique_tname = df_w_13H.target.tolist()  # 2-H INCLUDED, dataframe.target MUST 1 & 3 only to avoid duplicate
    unique_tname = unique_t.tolist()  # 2-H INCLUDED, dataframe.target MUST 1 & 3 only to avoid duplicate
    group_dict = {}
    for n, title in enumerate(unique_tname):
        if title == jobtitle:
            # group_dict[title] = 0
            # group_dict[title] = [0, 0.0, '', '']  # Added attr
            group_dict[title] = [0, 0.0, domains[title], functions[title]]  # Added attr
        if title not in group_dict:
            title_name = df_w_13H['target'] == title
            group_df = df_w_13H[title_name]
            group = group_df.iloc[0].hop_num
            similarity = group_df.iloc[0].similarity  # Added node attr
            # group_dict[title] = group
            title_dom = domains[title]  # Added node attr
            title_func = functions[title]  # Added node attr
            group_dict[title] = [n, similarity, title_dom, title_func]
        else:
            pass

    # Only take link list of 1 & 2. If only 2-hop titles present, 3 and only 3 will be taken.
    temp_links_list = list(
        drawing_df.apply(lambda row: {"source": row['source'], "target": row['target'], "value": round(row['similarity'], 3)},
                     axis=1))

    links_list = []
    for link in temp_links_list:
        record = {"value": link['value'], "source": unique_t.get_loc(link['source']),
                  "target": unique_t.get_loc(link['target'])}
        links_list.append(record)

    nodes_list = []
    for title in unique_t:
        posts = jobpost_df[jobpost_df.title == title]

        node_skill_list = []
        for row in range(posts.shape[0]):
            for word in (posts.iloc[row]['occur_skills'].split(',')):
                node_skill_list.append(word)

        node_skillcount_list = []
        skill_count = Counter(node_skill_list).most_common(nSkilleachJob) # skill_count format (name, count), (name, count)
        for skill in skill_count:
            node_skillcount_list.append({"skill_name": skill[0], "skill_count": skill[1]})

        # nodes_list.append({"name": title, "group": int(group_dict.get(title))})
        # nodes_list.append({"id": int(id_t_dict[title]), "name": title, "group": int(group_dict.get(title))})
        nodes_list.append({"id": int(id_t_dict[title]), "name": title, "group": int(group_dict.get(title)[0]), "popularity": posts.shape[0],
            "domain": group_dict.get(title)[2], "function": group_dict.get(title)[3], "similarity": round(group_dict.get(title)[1], 3),
            # "skills": list(set(node_skill_list))})
            "skills": node_skillcount_list})

    json_prep = {"name": jobtitle, "popularity":jobpost_df[jobpost_df.title == jobtitle].shape[0], "domain": domains[jobtitle], "function": functions[jobtitle], "nodes": nodes_list, "links": links_list,
                    "allpost_count": jobpost_df.shape[0]}

    jsonData = json.dumps(json_prep)
    print '\nDONE NODES AFTER %.1fs\n' % (time() - startJOB)
    return jsonify(jsonData)
    # return jsonify(json_prep)


@app_Isc.route('/data/job/get_all_skill/<path:jobtitle>')  # for drawing skill cloud
def getSkillsCSV(jobtitle):
    startSKILL = time()
    # SETTINGS
    verbose = True;  # Disable for NON-detail printing in terminal
    # set number of skills in each job
    nSkilleachJob = 10
    # set number of related skills to display: HTML Section="Top Skills"
    nTopSkills = 30
    # set number of displayed jobs/node
    nDispayedJobs = 35;
    # SETTINGS-END

    rel_titles = []
    t_id = id_t_dict[jobtitle]
    rowarr = data_dist[t_id]
    nnzero = np.nonzero(rowarr)[0].tolist()
    k = nDispayedJobs  # Number of nodes to show on screen
    if len(nnzero) > k:
        rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
        rowarr_copy = np.asarray(rowarr_l)
        zerosI = np.where(rowarr_copy == 0)[0]
        rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

        # Arrange n-smallest values to left of k
        k_most_similar = np.argpartition(rowarr_copy, k)
        sampleID = k_most_similar[:k]  # Return indices of smallest values
        n = k
    else:
        sampleID = nnzero
        n = len(nnzero)

    # if n == 0:
    #     print "JSON not saved: ", jobtitle
    #     return jsonify("")

    onehopall = np.nonzero(data_dist1H[t_id])[0].tolist()
    onehopI = list(set(sampleID) & set(onehopall))
    twohopall = np.nonzero(data_dist2H[t_id])[0].tolist()
    twohopI = list(set(sampleID) & set(twohopall))
    rel_titles = onehopI + twohopI
    rel_titles = [t_dict[t] for t in rel_titles]

    skill_list = []
    for rel_t in rel_titles:
        # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
        posts = jobpost_df[jobpost_df.title == rel_t]
        # post need to aggregate all
        # for row in range(posts.shape[0]):
        #     for word in (posts.iloc[row]['occur_skills'].split(',')):
        #         skill_list.append(word)
        node_skill_list = []
        for row in range(posts.shape[0]):
            for word in (posts.iloc[row]['occur_skills'].split(',')):
                node_skill_list.append(word)

        node_skillcount_list = []
        skill_count = Counter(node_skill_list).most_common(nSkilleachJob) # skill_count format (name, count), (name, count)
        for skill in skill_count:
            skill_list.append(skill[0])

    print "skill_list", len(skill_list)
    skill_count = Counter(skill_list).most_common(nTopSkills)  # most_common takes int param for max number of words
    skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
    skill_count_df.sort_values(['count'], ascending=False, inplace=True)
    top_skills_data = list(
        skill_count_df.apply(lambda row: {"name": row['skill_name'], "value": row['count']}, axis=1))
    # print top_skills_data
    # jsonSkills = json.dumps(top_skills_data)
    print '\nDONE SKILLS AFTER %.1fs\n' % (time() - startSKILL)
    return jsonify(top_skills_data)
    # return skill_count_df.to_csv()
    # return jsonify(skill_count_df)


@app_Isc.route('/data/job/get_selected_skill/', defaults={'param': None})  # for updating skill cloud based on visible nodes 
@app_Isc.route('/data/job/get_selected_skill/<param>')
def updateSkillsCSV(param):
    nSkilleachJob = 10
    nTopSkills = 30

    jobtitle = request.args.get('job')
    job_num = request.args.get('job_num')
    rel_titles = []
    t_id = id_t_dict[jobtitle]
    rowarr = data_dist[t_id]
    nnzero = np.nonzero(rowarr)[0].tolist()
    k = int(job_num)  # Number of nodes to show on screen
    if len(nnzero) > k:
        rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
        rowarr_copy = np.asarray(rowarr_l)
        zerosI = np.where(rowarr_copy == 0)[0]
        rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

        # Arrange n-smallest values to left of k
        k_most_similar = np.argpartition(rowarr_copy, k)
        sampleID = k_most_similar[:k]  # Return indices of smallest values
        n = k
    else:
        sampleID = nnzero
        n = len(nnzero)

    # if n == 0:
    #     print "JSON not saved: ", jobtitle
    #     return jsonify("")

    onehopall = np.nonzero(data_dist1H[t_id])[0].tolist()
    onehopI = list(set(sampleID) & set(onehopall))
    twohopall = np.nonzero(data_dist2H[t_id])[0].tolist()
    twohopI = list(set(sampleID) & set(twohopall))
    rel_titles = onehopI + twohopI
    rel_titles = [t_dict[t] for t in rel_titles]

    skill_list = []
    for rel_t in rel_titles:
        print rel_t
        # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
        posts = jobpost_df[jobpost_df.title == rel_t]
        # post need to aggregate all
        # for row in range(posts.shape[0]):
        #     for word in (posts.iloc[row]['occur_skills'].split(',')):
        #         skill_list.append(word)

        node_skill_list = []
        for row in range(posts.shape[0]):
            for word in (posts.iloc[row]['occur_skills'].split(',')):
                node_skill_list.append(word)

        node_skillcount_list = []
        skill_count = Counter(node_skill_list).most_common(nSkilleachJob) # skill_count format (name, count), (name, count)
        for skill in skill_count:
            skill_list.append(skill[0])

    print "skill_list", len(skill_list)
    skill_count = Counter(skill_list).most_common(nTopSkills)  # most_common takes int param for max number of words
    skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
    skill_count_df.sort_values(['count'], ascending=False, inplace=True)
    top_skills_data = list(
        skill_count_df.apply(lambda row: {"name": row['skill_name'], "value": row['count']}, axis=1))
    # print top_skills_data
    # jsonSkills = json.dumps(top_skills_data)
    return jsonify(top_skills_data)


# @app_Isc.route('/network/job/<jobtitle>')  #old
# def jobGraph(jobtitle):
#     # return render_template("network.html", job_title=jobtitle, json_data=jsonify(data), ac_list=autocomplete_f)
#     return render_template("network.html", job_title=jobtitle, ac_list=title_list)


@app_Isc.route('/categoryjob/')  #from tianyuan, seperate app
def categoryJobHTML():
    return render_template("categoryjob.html")


@app_Isc.route('/data/categoryjob/')
def getCategoryJobDATA():
    verbose = True;  # Disable for NON-detail printing in terminal

    # dom_q = 'nodeType == "{}"'.format('domain')
    # func_q = 'nodeType == "{}"'.format('function')
    # domain_nodes_df = relation_nodes_df.query(dom_q)
    # function_nodes_df = relation_nodes_df.query(func_q)
    # domain_node_labels_list = domain_nodes_df.id.tolist()
    # function_node_labels_list = function_nodes_df.id.tolist()
    # category_nodes_df.to_csv(DATA_DIR + '/Relational/word2vect_category/node_word2vec_1_new.csv', sep=",", quoting=csv.QUOTE_NONNUMERIC, index=False)
    threshold = 10
    weight_filter = category_nodes_df['weight'] > threshold
    # domain_filter = relation_links_df['source'].isin(domain_node_labels_list)
    # function_filter = relation_links_df['source'].isin(function_node_labels_list)

    cat_node_df = category_nodes_df[weight_filter]
    pd.set_option('max_rows', cat_node_df.shape[0])
    print "df, n: {}\n".format(cat_node_df.shape[0])
    pd.reset_option('max_rows')

    nodeidlist = cat_node_df.id.tolist()
    edge_source_filter = category_links_df['source'].isin(nodeidlist)
    edge_target_filter = category_links_df['target'].isin(nodeidlist)

    cat_links_df = category_links_df[edge_source_filter & edge_target_filter]
    print "cat_links_df, length: {}\n".format(cat_links_df.shape[0])

    cat_links_df.sort_values(['source', 'target'], ascending=[True,True], inplace=True)
    cat_links_df.reset_index(level=0, drop=True)

    # if verbose:
    #     # for debugging: show values
    #     pass

    dataframe = cat_links_df
    
    unique_t = pd.Index(cat_node_df['title'])

    unique_tname = unique_t.tolist()
    group_dict = {}  # to store title groups
    for title in unique_tname:
        if title not in group_dict:
            cur_title_row = cat_node_df['title'] == title
            group_df = cat_node_df[cur_title_row]
            group_dict[title] = group_df.iloc[0].weight
        else:
            pass

    # # Only take link list of 1 & 2. If only 2-hop titles present, 3 and only 3 will be taken.
    temp_links_list = list(
        dataframe.apply(lambda row: {"source": cat_label_dict[(row['source'])], "target": cat_label_dict[(row['target'])], "value": round(row['weight'], 3)},
                     axis=1))

    links_list = []
    for link in temp_links_list:
        record = {"value": link['value'], "source": unique_t.get_loc(link['source']), "target": unique_t.get_loc(link['target'])}
        links_list.append(record)

    nodes_list = []
    for title in unique_t:
        nodes_list.append({"id": int(cat_label_id_dict[title]), "name": title, "node_weight": int(group_dict.get(title))})

    json_prep = {"nodes": nodes_list, "links": links_list}

    # print json_prep

    jsonData = json.dumps(json_prep)

    return jsonify(json_prep)


# @app_Isc.route('/data/network/relation/bPtestDOM/')
# def getBipartiteDataTESTDOM():
#     q = 'nodeType == "{}"'.format('domain')

#     nodes_df = relation_nodes_df.query(q)
#     node_labels_list = nodes_df.id.tolist()
#     type_filter = relation_links_df['source'].isin(node_labels_list)
#     # weight_filter = relation_links_df['weight'] >= threshold
#     # type_relation_df = relation_links_df[type_filter & weight_filter]
#     type_relation_df = relation_links_df[type_filter]  # category/role
#     type_relation_df.sort_values(['target', 'source'], ascending=[True,True], inplace=True)
#     topic_size = len(type_relation_df.target.unique())
#     print "\nskill group size: {}\n".format(topic_size)
#     columns_temp = sorted(type_relation_df.source.unique().tolist())
#     index_temp = sorted(type_relation_df.target.unique().tolist())
#     start = 3866
#     print "\ncolumns_temp: {}\n".format(columns_temp)
#     print "columns_temp:\n", columns_temp
#     for index in index_temp:
#         sel_target_df = type_relation_df['target'] == index
#         tmpdf = type_relation_df[sel_target_df].copy()
#         for column in columns_temp:
#             if column not in tmpdf.source.tolist():
#                 type_relation_df = type_relation_df.append(pd.DataFrame([[column, index, start+1, 0]], columns=['source', 'target', 'id', 'weight']))
#                 start += 1
#             else:
#                 pass

#     type_relation_df.sort_values(['target', 'source'], ascending=[True,True], inplace=True)

#     type_relation_df.reset_index(level=0, drop=True)

#     # pd.set_option('max_rows', type_relation_df.shape[0])
#     # print "df, n: {}\n".format(type_relation_df.shape[0]), type_relation_df
#     # pd.reset_option('max_rows')
#     type_relation_df.to_csv(DATA_DIR + '/Relational/edge_DomainSkillGroup.csv', index=False)

#     temp_columns = []
#     for column in columns_temp:
#         temp_columns.append(["R", label_dict[column]])

#     temp_index = []
#     for index in index_temp:
#         temp_index.append([label_dict[index]])

#     data = []
#     for index in index_temp:
#         filterbytarget = type_relation_df["target"] == index
#         tmptargetdf = type_relation_df[filterbytarget].copy()
#         data_row = tmptargetdf.weight.tolist()
#         data.append([round(elem, 4) for elem in data_row])

#     # data = list(
#     #     type_relation_df.apply(lambda row: round(row['weight'], 4),
#     #                  axis=1))

#     type_relation_data = {"columns": temp_columns, "index": temp_index, "data": data}
#     final_data = json.dumps(type_relation_data)

#     return jsonify(type_relation_data)


# @app_Isc.route('/navigate/', defaults={'param': None})
# @app_Isc.route('/navigate/<param>')
# def handle_dbclick(param):
#   # jobtitle = ''
#   jobtitle = request.args.get('title')
#   print "Enter Node Navigate :", jobtitle
#   return redirect(url_for('network_graph', jobtitle=jobtitle))


# @app_Isc.route('/data/get_sim_content/<simtitle_name>')  # going to need a <sim_title_name>
# def getSimTitleContents(simtitle_name):
#     simtitle_dom = domains[simtitle_name]  # DOM
#     simtitle_func = functions[simtitle_name]  # FUNC
#     # if simtitle_dom is None:
#     #     simtitle_dom = "-"
#     # if simtitle_func is None:
#     #     simtitle_func = "-"
#     simtitle_JSON_prep = {"name": simtitle_name, "domain": simtitle_dom, "function": simtitle_func}
#     simtitle_JSON = json.dumps(simtitle_JSON_prep)
#     return jsonify(simtitle_JSON)


# @app_Isc.route('/data/get_skill/<simtitle_name>')
# def getSimTitleSkillsCSV(simtitle_name):
#     # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
#     posts = jobpost_df[jobpost_df.title == simtitle_name]
#     # first_post = posts.iloc[0]  #First post in record
#     # skills_arr = first_post['occur_skills'].split(',')  #Maybe need to toList()
#     # post need to aggregate all
#     skill_list = []
#     for row in range(posts.shape[0]):
#         for word in (posts.iloc[row]['occur_skills'].split(',')):
#             skill_list.append(word)
#     print len(skill_list)
#     skill_count = Counter(skill_list).most_common()  # most_common takes int param for max number of words
#     skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
#     return skill_count_df.to_csv()
    # return jsonify(skill_count_df)


# @app_Isc.route('/data/get_all_skill/<jobtitle>')  # for drawing skill cloud
# def getSkillsCSV(jobtitle):
#     rel_titles = []
#     t_id = id_t_dict[jobtitle]
#     rowarr = data_dist[t_id]
#     nnzero = np.nonzero(rowarr)[0].tolist()
#     k = 50  # Number of nodes to show on screen
#     if len(nnzero) > k:
#         rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
#         rowarr_copy = np.asarray(rowarr_l)
#         zerosI = np.where(rowarr_copy == 0)[0]
#         rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

#         # Arrange n-smallest values to left of k
#         k_most_similar = np.argpartition(rowarr_copy, k)
#         sampleID = k_most_similar[:k]  # Return indices of smallest values
#         n = k
#     else:
#         sampleID = nnzero
#         n = len(nnzero)

#     # if n == 0:
#     #     print "JSON not saved: ", jobtitle
#     #     return jsonify("")

#     onehopall = np.nonzero(data_dist1H[t_id])[0].tolist()
#     onehopI = list(set(sampleID) & set(onehopall))
#     twohopall = np.nonzero(data_dist2H[t_id])[0].tolist()
#     twohopI = list(set(sampleID) & set(twohopall))
#     rel_titles = onehopI + twohopI
#     rel_titles = [t_dict[t] for t in rel_titles]

#     skill_list = []
#     for rel_t in rel_titles:
#         # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
#         posts = jobpost_df[jobpost_df.title == rel_t]
#         # post need to aggregate all
#         for row in range(posts.shape[0]):
#             for word in (posts.iloc[row]['occur_skills'].split(',')):
#                 skill_list.append(word)
#     print "skill_list", len(skill_list)
#     skill_count = Counter(skill_list).most_common(90)  # most_common takes int param for max number of words
#     skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
#     return skill_count_df.to_csv()
#     # return jsonify(skill_count_df)


# @app_Isc.route('/data/get_skill/<simtitle_name>')  # for skill bar chart
# def getSimTitleSkillsCSV(simtitle_name):
#     # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
#     posts = jobpost_df[jobpost_df.title == simtitle_name]
#     # first_post = posts.iloc[0]  #First post in record
#     # skills_arr = first_post['occur_skills'].split(',')  #Maybe need to toList()
#     # post need to aggregate all
#     skill_list = []
#     for row in range(posts.shape[0]):
#         for word in (posts.iloc[row]['occur_skills'].split(',')):
#             skill_list.append(word)
#     print len(skill_list)
#     skill_count = Counter(skill_list).most_common(20)  # most_common takes int param for max number of words
#     skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
#     skill_count_df.sort_values(['count'], ascending=True, inplace=True)
#     top_skills_data = list(
#         skill_count_df.apply(lambda row: {"name": row['skill_name'], "value": row['count']}, axis=1))
#     # return skill_count_df.to_csv()
#     return jsonify(top_skills_data)


@app_Isc.route('/test/data/network/job/<jobtitle>')
def testgetNetworkData(jobtitle):
    verbose = True;  # Disable for NON-detail printing in terminal
    
    titles_master_list = []
    t_id = id_t_dict[jobtitle]
    rowarr = data_dist[t_id]
    nnzero = np.nonzero(rowarr)[0].tolist()
    k = 100  # Number of nodes to show on screen
    if len(nnzero) > k:

        rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
        rowarr_copy = np.asarray(rowarr_l)
        zerosI = np.where(rowarr_copy == 0)[0]
        rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

        # Arrange n-smallest values to left of k
        k_most_similar = np.argpartition(rowarr_copy, k)
        sampleID = k_most_similar[:k]  # Return indices of smallest values

        n = k
    else:
        sampleID = nnzero
        n = len(nnzero)
    if verbose:
        print "Nonzeros found: {}".format(len(nnzero))

    if n == 0:
        print "JSON not saved: ", jobtitle
        return jsonify("")

    onehopall = np.nonzero(data_dist1H[t_id])[0].tolist()
    onehopI = list(set(sampleID) & set(onehopall))

    # Differentiate onehop similar by dom/func =(1 or 2) or twohop =(3)
    if functions[jobtitle] == "":  # Similar by domain
        for oneHop in onehopI:
            titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 2])
    if domains[jobtitle] == "":  # Similar by function
        for oneHop in onehopI:
            titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 1])
    else:
        for oneHop in onehopI:
            if domains[jobtitle] == domains[t_dict[oneHop]]:
                titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 2])
            else:
                titles_master_list.append([jobtitle, t_dict[oneHop], 1 - data_dist[t_id, oneHop], 1])

    twohopall = np.nonzero(data_dist2H[t_id])[0].tolist()
    twohopI = list(set(sampleID) & set(twohopall))

    for twoHop in twohopI:
        titles_master_list.append([jobtitle, t_dict[twoHop], 1 - data_dist[t_id, twoHop], 3])
    # Connections between 1H & 2H
    for oneHop in onehopI:
        p2H = np.nonzero(data_dist1H[oneHop])[0].tolist()
        connected_t2 = list(set(p2H) & set(twohopI))
        if connected_t2:
            for t2 in connected_t2:
                titles_master_list.append([t_dict[oneHop], t_dict[t2], 1 - data_dist[oneHop, t2], 12])

    if verbose:
        print "Title:", jobtitle
        print "{} sampled titles".format(n)
        print "Total 1H in sample: {}".format(len(onehopI))
        print "Total 2H in sample: {}".format(len(twohopI))

    nw_data = pd.DataFrame(titles_master_list, columns=['t1', 't2', 'similarity', 'hop_num'])
    nw_data.drop_duplicates(['t1', 't2'])
    nw_data.sort_values(['similarity'], ascending=False, inplace=True)
    nw_data.reset_index(level=0, drop=True)

    if verbose:
        h2_df = nw_data[nw_data['hop_num'] == 3]
        h1_dom_df = nw_data[nw_data['hop_num'] == 2]
        h1_func_df = nw_data[nw_data['hop_num'] == 1]
        total2Ht = h2_df.shape[0]
        total1Ht = h1_func_df.shape[0] + h1_dom_df.shape[0]
        print "2-Hop title count: ", total2Ht
        print "1-Hop title count: ", total1Ht
        print "Total similar titles from {}: {}".format(jobtitle, total1Ht + total2Ht)
        print "Total number of edges: ", (nw_data.shape[0] - total2Ht)

    dataframe = nw_data


    dataframe.rename(columns={"t1": "source", "t2": "target"}, inplace=True)

    # Need to change here
    one_hFunc = dataframe['hop_num'] == 1  # same function
    one_hDom = dataframe['hop_num'] == 2  # same domain
    two_h = dataframe['hop_num'] == 3  # two hop
    # contains hop_num == 3 and 
    df_w_13H = dataframe[one_hFunc | one_hDom | two_h]
    # New data frame taking 1 & 2 = DF
    one_two_h = dataframe['hop_num'] == 12

    hop2_target_names = set(dataframe[two_h].target.tolist())
    hop12_target_names = set(dataframe[one_two_h].target.tolist())
    two_h_filter_list = list(hop2_target_names - hop12_target_names)

    two_h_tmp = dataframe[two_h].copy()
    two_h_filter = two_h_tmp['target'].isin(two_h_filter_list)

    # Check if only consist of 2-Hop
    hopnum = df_w_13H.hop_num.unique()
    if len(hopnum) == 1 and hopnum[0] == 3:
        drawing_df = dataframe[two_h]  # Draw only 2-Hop links
    else:
        # drawing_df = dataframe[one_hFunc | one_hDom | one_two_h]
        # drawing_df = dataframe[one_hFunc | one_hDom | one_two_h | two_h_filter]
        drawing_df = dataframe[one_hFunc | one_hDom | two_h]

    unique_t = pd.Index(df_w_13H['source'].append(df_w_13H['target']).reset_index(drop=True).unique())

    # unique_tname = df_w_13H.target.tolist()  # 2-H INCLUDED, dataframe.target MUST 1 & 3 only to avoid duplicate
    unique_tname = unique_t.tolist()  # 2-H INCLUDED, dataframe.target MUST 1 & 3 only to avoid duplicate
    group_dict = {}
    for title in unique_tname:
        if title == jobtitle:
            # group_dict[title] = 0
            group_dict[title] = [0, 0.0, '', '']  # Added attr
        if title not in group_dict:
            title_name = df_w_13H['target'] == title
            group_df = df_w_13H[title_name]
            group = group_df.iloc[0].hop_num
            similarity = group_df.iloc[0].similarity  # Added node attr
            # group_dict[title] = group
            title_dom = domains[title]  # Added node attr
            title_func = functions[title]  # Added node attr
            group_dict[title] = [group, similarity, title_dom, title_func]
        else:
            pass

    # Only take link list of 1 & 2. If only 2-hop titles present, 3 and only 3 will be taken.
    temp_links_list = list(
        drawing_df.apply(lambda row: {"source": row['source'], "target": row['target'], "value": round(row['similarity'], 3)},
                     axis=1))

    links_list = []
    for link in temp_links_list:
        record = {"value": link['value'], "source": unique_t.get_loc(link['source']),
                  "target": unique_t.get_loc(link['target'])}
        links_list.append(record)

    nodes_list = []
    for title in unique_t:
        posts = jobpost_df[jobpost_df.title == title]

        node_skill_list = []
        for row in range(posts.shape[0]):
            for word in (posts.iloc[row]['occur_skills'].split(',')):
                node_skill_list.append(word)

        node_skillcount_list = []
        skill_count = Counter(node_skill_list).most_common(50) # skill_count format (name, count), (name, count)
        print title, len(skill_count)
        for skill in skill_count:
            node_skillcount_list.append({"skill_name": skill[0], "skill_count": skill[1]})

        # nodes_list.append({"name": title, "group": int(group_dict.get(title))})
        # nodes_list.append({"id": int(id_t_dict[title]), "name": title, "group": int(group_dict.get(title))})
        nodes_list.append({"id": int(id_t_dict[title]), "name": title, "group": int(group_dict.get(title)[0]),
            "domain": group_dict.get(title)[2], "function": group_dict.get(title)[3], "similarity": round(group_dict.get(title)[1], 3),
            # "skills": list(set(node_skill_list))})
            "skills": node_skillcount_list})

    json_prep = {"name": jobtitle, "domain": domains[jobtitle], "function": functions[jobtitle], "nodes": nodes_list, "links": links_list}

    jsonData = json.dumps(json_prep)

    # return render_template("network.html", job_title=jobtitle, json_data=jsonify(data), ac_list=autocomplete_f)
    # return jsonify(jsonData)
    return jsonify(json_prep)


@app_Isc.route('/test/data/get_all_skill/<jobtitle>')
def getSkillsCSVtest(jobtitle):
    rel_titles = []
    t_id = id_t_dict[jobtitle]
    rowarr = data_dist[t_id]
    nnzero = np.nonzero(rowarr)[0].tolist()
    k = 100  # Number of nodes to show on screen
    if len(nnzero) > k:
        rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
        rowarr_copy = np.asarray(rowarr_l)
        zerosI = np.where(rowarr_copy == 0)[0]
        rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

        # Arrange n-smallest values to left of k
        k_most_similar = np.argpartition(rowarr_copy, k)
        sampleID = k_most_similar[:k]  # Return indices of smallest values
        n = k
    else:
        sampleID = nnzero
        n = len(nnzero)

    # if n == 0:
    #     print "JSON not saved: ", jobtitle
    #     return jsonify("")

    onehopall = np.nonzero(data_dist1H[t_id])[0].tolist()
    onehopI = list(set(sampleID) & set(onehopall))
    twohopall = np.nonzero(data_dist2H[t_id])[0].tolist()
    twohopI = list(set(sampleID) & set(twohopall))
    rel_titles = onehopI + twohopI
    rel_titles = [t_dict[t] for t in rel_titles]

    skill_list = []
    for rel_t in rel_titles:
        # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
        posts = jobpost_df[jobpost_df.title == rel_t]
        # post need to aggregate all
        for row in range(posts.shape[0]):
            for word in (posts.iloc[row]['occur_skills'].split(',')):
                skill_list.append(word)
    print "skill_list", len(skill_list)
    skill_count = Counter(skill_list).most_common(50)  # most_common takes int param for max number of words
    # skill_count = [(b,c) for b,c in Counter(skill_list).iteritems() if c >= 10]
    skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
    # skill_count_df.sort_values(['count'], ascending=False, inplace=True)
    # return skill_count_df.to_csv()
    return jsonify(skill_count_df)


@app_Isc.route('/test/data/get_skill/<simtitle_name>')
def testSkillsCSV(simtitle_name):
    # Refer ja_helpers.py line 486 >>> def skillSim(p1, p2):
    posts = jobpost_df[jobpost_df.title == simtitle_name]
    # first_post = posts.iloc[0]  #First post in record
    # skills_arr = first_post['occur_skills'].split(',')  #Maybe need to toList()
    # post need to aggregate all
    skill_list = []
    for row in range(posts.shape[0]):
        for word in (posts.iloc[row]['occur_skills'].split(',')):
            skill_list.append(word)
    print len(skill_list)
    skill_count = Counter(skill_list).most_common()  # most_common takes int param for max number of words
    skill_count_df = pd.DataFrame(skill_count, columns=['skill_name', 'count'])
    # return skill_count_df.to_csv()
    return jsonify(skill_count_df)


@app_Isc.route('/test/')
def testSkillsChart():
    # return render_template("test/skills_chart.html")
    return render_template("test/skills_chart_v4.html")
    # return render_template("landing.html")

@app_Isc.route('/test_skillcloud/')
def test_skillcloud():
    return render_template("testing.html", ac_list=title_list)
    # return render_template("landing.html")

# @app_Isc.route('/ACCESSnSAVEcsv/')
# def saveCSV():
#     cores_skill_group_filter = ch_topicskills_links_df['target'] < 11505  #start from 11505 duplicated
#     selected_sg_df = ch_topicskills_links_df[cores_skill_group_filter].copy()
#     selected_sg_df.sort_values(['source', 'target'], ascending=[True,True], inplace=True)
#     selected_sg_df.to_csv(DATA_DIR + '/Relational/edge_TopicSkill.csv', index=False)
#     return jsonify(selected_sg_df)
#     # return render_template("landing.html")

# @app_Isc.route('/MIRRORnSavecsv/')
# def mirrorCSV():
#     tmp_df = chord_links_df.copy()
#     new_column_arrgm = ['target', 'source', 'weight']
#     tmp_df = tmp_df.reindex(columns=new_column_arrgm)
#     tmp_df.rename(columns={"target": "source", "source": "target"}, inplace=True)
#     combined_df = chord_links_df.append(tmp_df, ignore_index=True)
#     combined_df.sort_values(['source','target'], ascending=[True,True], inplace=True)
#     combined_df.reset_index(drop=True)
#     combined_df.to_csv(DATA_DIR + '/Relational/new_edge_TopicTopic.csv', index=False)
#     # pd.set_option('max_rows', combined_df.shape[0])
#     # print "combined_df\n", combined_df
#     # pd.reset_option('max_rows')
#     print "\nsum of source == 0\n", combined_df.loc[combined_df['source'] == 0, 'weight'].sum() , "\n"

#     skill_group_data = list(
#         combined_df.apply(lambda row: [ch_label_dict[(row['source'])], ch_label_dict[(row['target'])], round(row['weight'], 5)],
#                      axis=1))
#     print "chord_links_df size", len(skill_group_data)
#     rel_data = skill_group_data

#     return jsonify(rel_data)


# @app_Isc.route('/data/skill_dict/')  #for relationBipartite_Chord.html: skills force directed
# def prepSkillAvail():
#     skill_list = ch_topicskills_links_df.target.unique().tolist()
#     skill_dict = [[skill, ch_label_dict[skill]] for skill in skill_list]
#     skill_list_df = pd.DataFrame(skill_dict, columns=['id', 'skill'])
#     skill_list_df.sort_values(['skill'], ascending=True, inplace=True)
#     skill_list_df.to_csv(DATA_DIR + '/Relational/skills_dict_temp.csv', index=False)
#     # return render_template("network.html", job_title=jobtitle, json_data=jsonify(data), ac_list=autocomplete_f)
#     return jsonify(skill_list_df)

# Related Job Titles API
# Input: Jobtitle
# Output: Related Job Titles
# Output Format: JSON
@app_Isc.route('/data/relatedjob/<jobtitle>')
def getRelatedJOBS(jobtitle):
    # get skills and its corresponding count from all job posts for given jobtitle
    def getJobSkillCount(title):
        posts = jobpost_df[jobpost_df.title == title]

        node_skill_list = []
        for row in range(posts.shape[0]):
            for word in (posts.iloc[row]['occur_skills'].split(',')):
                node_skill_list.append(word)

        node_skillcount_list = []
        skill_count = Counter(node_skill_list).most_common(nSkilleachJob) # skill_count format (name, count), (name, count)
        for skill in skill_count:
            node_skillcount_list.append({"skill_name": skill[0], "skill_count": skill[1]})
        return node_skillcount_list

    # get number of job post for given jobtitle
    def getNumJobPosts(title):
        return jobpost_df[jobpost_df.title == title].shape[0]

    startJOB = time()
    
    # SETTINGS
    verbose = True;  # Disable for NON-detail printing in terminal

    nSkilleachJob = 10
    nDispayedJobs = 35;
    # SETTINGS-END

    jobtitle = jobtitle.title()
    
    titles_master_list = []
    t_id = id_t_dict[jobtitle]
    rowarr = data_dist[t_id]
    nnzero = np.nonzero(rowarr)[0].tolist()
    k = nDispayedJobs  # Number of nodes to show on screen
    if len(nnzero) > k:

        rowarr_l = rowarr.tolist()  # Make a copy to avoid modifying original
        rowarr_copy = np.asarray(rowarr_l)
        zerosI = np.where(rowarr_copy == 0)[0]
        rowarr_copy[zerosI] = 10  # Turn distance value 0 to 10

        # Arrange n-smallest values to left of k
        k_most_similar = np.argpartition(rowarr_copy, k)
        sampleID = k_most_similar[:k]  # Return indices of smallest values

        n = k
    else:
        sampleID = nnzero
        n = len(nnzero)

    if n == 0:
        print "JSON not saved: ", jobtitle
        return jsonify("")

    for j_id in sampleID:
        titles_master_list.append([jobtitle, t_dict[j_id], 1 - data_dist[t_id, j_id]])

    nw_data = pd.DataFrame(titles_master_list, columns=['source', 'target', 'similarity'])
    nw_data.sort_values(['similarity'], ascending=False, inplace=True)
    nw_data.reset_index(level=0, drop=True)

    rel_jtitles_l = {"data": list(
        nw_data.apply(lambda row: {"id": int(id_t_dict[row['target']]), "title_name": row['target'],
                                   "popularity": getNumJobPosts(row['target']),
                                   "domain": domains[row['target']], "function": functions[row['target']],
                                   "similarity": round(row['similarity'], 3),
                                   "skills": getJobSkillCount(row['target'])}, axis=1))}

    if verbose:
        print "Title:", jobtitle
        print "{} sampled titles".format(n)

    # jsonData = json.dumps(json_prep)
    print '\nDONE NODES AFTER %.1fs\n' % (time() - startJOB)
    return jsonify(rel_jtitles_l)
    # return jsonify(json_prep)
