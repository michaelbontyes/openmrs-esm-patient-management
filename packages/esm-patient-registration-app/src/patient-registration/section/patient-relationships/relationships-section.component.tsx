import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Button,
  Layer,
  Select,
  SelectItem,
  InlineNotification,
  NotificationActionButton,
  SkeletonText,
} from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { FieldArray } from 'formik';
import { useTranslation } from 'react-i18next';
import { Autosuggest } from '../../input/custom-input/autosuggest/autosuggest.component';
import { PatientRegistrationContext } from '../../patient-registration-context';
import { ResourcesContext } from '../../../offline.resources';
import { fetchPerson } from '../../patient-registration.resource';
import { RelationshipValue } from '../../patient-registration.types';
import sectionStyles from '../section.scss';
import styles from './relationships.scss';

interface RelationshipType {
  display: string;
  uuid: string;
  direction: string;
}

interface RelationshipViewProps {
  relationship: RelationshipValue;
  index: number;
  displayRelationshipTypes: RelationshipType[];
  remove: <T>(index: number) => T;
}

const RelationshipView: React.FC<RelationshipViewProps> = ({
  relationship,
  index,
  displayRelationshipTypes,
  remove,
}) => {
  const { t } = useTranslation();
  const { setFieldValue } = React.useContext(PatientRegistrationContext);

  const newRelationship = !relationship.uuid;

  const handleRelationshipTypeChange = useCallback((event) => {
    const { target } = event;
    const field = target.name;
    const value = target.options[target.selectedIndex].value;
    setFieldValue(field, value);
    if (!relationship?.action) {
      setFieldValue(`relationships[${index}].action`, 'UPDATE');
    }
  }, []);

  const handleSuggestionSelected = useCallback((field: string, selectedSuggestion: string) => {
    setFieldValue(field, selectedSuggestion);
  }, []);

  const searchPerson = async (query: string) => {
    const abortController = new AbortController();
    const searchResults = await fetchPerson(query);
    return searchResults.data.results;
  };

  const deleteRelationship = useCallback(() => {
    if (relationship.action === 'ADD') {
      remove(index);
    } else {
      setFieldValue(`relationships[${index}].action`, 'DELETE');
    }
  }, [relationship, index]);

  const restoreRelationship = useCallback(() => {
    setFieldValue(`relationships[${index}]`, {
      ...relationship,
      action: undefined,
      relationshipType: relationship.initialrelationshipTypeValue,
    });
  }, [index]);

  return relationship.action !== 'DELETE' ? (
    <div className={styles.relationship}>
      <div className={styles.searchBox}>
        <div className={styles.relationshipHeader}>
          <h4 className={styles.productiveHeading}>{t('relationshipPlaceholder', 'Relationship')}</h4>
          <Button
            kind="ghost"
            iconDescription={t('deleteRelationshipTooltipText', 'Delete')}
            hasIconOnly
            onClick={deleteRelationship}>
            <TrashCan size={16} className={styles.trashCan} />
          </Button>
        </div>
        <div>
          {newRelationship ? (
            <Autosuggest
              name={`relationships[${index}].relatedPersonUuid`}
              labelText={t('relativeFullNameLabelText', 'Full name')}
              placeholder={t('relativeNamePlaceholder', 'Firstname Familyname')}
              defaultValue={relationship.relatedPersonName}
              onSuggestionSelected={handleSuggestionSelected}
              getSearchResults={searchPerson}
              getDisplayValue={(item) => item.display}
              getFieldValue={(item) => item.uuid}
              required
            />
          ) : (
            <>
              <span className={styles.labelText}>{t('relativeFullNameLabelText', 'Full name')}</span>
              <p className={styles.bodyShort02}>{relationship.relatedPersonName}</p>
            </>
          )}
        </div>
      </div>
      <div className={`${styles.selectRelationshipType}`} style={{ marginBottom: '1rem' }}>
        <Layer>
          <Select
            id="select"
            labelText={t('relationship', 'Relationship')}
            onChange={handleRelationshipTypeChange}
            name={`relationships[${index}].relationshipType`}
            defaultValue={relationship?.relationshipType ?? 'placeholder-item'}>
            <SelectItem
              disabled
              hidden
              value="placeholder-item"
              text={t('relationshipToPatient', 'Relationship to patient')}
            />
            {displayRelationshipTypes.map((relationshipType, index) => (
              <SelectItem
                text={relationshipType.display}
                value={`${relationshipType.uuid}/${relationshipType.direction}`}
                key={`relationship-${relationshipType.uuid}-${index}`}
              />
            ))}
          </Select>
        </Layer>
      </div>
    </div>
  ) : (
    <InlineNotification
      kind="info"
      title={t('relationshipRemovedText', 'Relationship removed')}
      actions={
        <NotificationActionButton onClick={restoreRelationship}>
          {t('restoreRelationshipActionButton', 'Undo')}
        </NotificationActionButton>
      }
    />
  );
};

export const RelationshipsSection = () => {
  const { relationshipTypes } = useContext(ResourcesContext);
  const [displayRelationshipTypes, setDisplayRelationshipTypes] = useState<RelationshipType[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (relationshipTypes) {
      const tmp: RelationshipType[] = [];
      relationshipTypes.results.forEach((type) => {
        const aIsToB = {
          display: type.displayAIsToB ? type.displayAIsToB : type.aIsToB,
          uuid: type.uuid,
          direction: 'aIsToB',
        };
        const bIsToA = {
          display: type.displayBIsToA ? type.displayBIsToA : type.bIsToA,
          uuid: type.uuid,
          direction: 'bIsToA',
        };
        aIsToB.display === bIsToA.display ? tmp.push(aIsToB) : tmp.push(aIsToB, bIsToA);
      });
      setDisplayRelationshipTypes(tmp);
    }
  }, [relationshipTypes]);

  if (!relationshipTypes) {
    return (
      <section aria-label="Loading relationships section">
        <SkeletonText role="progressbar" />
      </section>
    );
  }

  return (
    <section aria-label="Relationships section">
      <FieldArray name="relationships">
        {({
          push,
          remove,
          form: {
            values: { relationships },
          },
        }) => (
          <div>
            {relationships && relationships.length > 0
              ? relationships.map((relationship: RelationshipValue, index) => (
                  <div key={index} className={sectionStyles.formSection}>
                    <RelationshipView
                      relationship={relationship}
                      index={index}
                      displayRelationshipTypes={displayRelationshipTypes}
                      key={index}
                      remove={remove}
                    />
                  </div>
                ))
              : null}
            <div className={styles.actions}>
              <Button
                kind="ghost"
                onClick={() =>
                  push({
                    relatedPersonUuid: '',
                    action: 'ADD',
                  })
                }>
                {t('addRelationshipButtonText', 'Add Relationship')}
              </Button>
            </div>
          </div>
        )}
      </FieldArray>
    </section>
  );
};
