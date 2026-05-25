import React from 'react';
import { Building2, Award } from 'lucide-react';
import { ProductionCompany } from '../../types';
import { getImageUrl } from '../../services/tmdb';
import SectionHeader from './SectionHeader';

interface ProductionCompaniesSectionProps {
  readonly companies: ProductionCompany[];
  readonly limit?: number;
}

/**
 * Refined production companies card. Displays each studio with its logo,
 * name, and origin country. Falls back to an Award icon when no logo exists.
 */
const ProductionCompaniesSection: React.FC<ProductionCompaniesSectionProps> = ({
  companies,
  limit = 5,
}) => {
  if (!companies || companies.length === 0) return null;

  const visible = companies.slice(0, limit);

  return (
    <section>
      <SectionHeader
        eyebrow="Studios"
        icon={Building2}
        title="Production"
        count={companies.length}
        size="sm"
      />

      <div className="space-y-2.5">
        {visible.map((company) => (
          <div
            key={company.id}
            className="group flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300"
          >
            <div className="w-11 h-11 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:bg-white/10 transition-colors">
              {company.logo_path ? (
                <img
                  src={getImageUrl(company.logo_path, 'w200')}
                  alt={company.name}
                  className="max-w-[80%] max-h-[80%] object-contain"
                  loading="lazy"
                />
              ) : (
                <Award className="w-5 h-5 text-netflix-red" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm group-hover:text-netflix-red transition-colors truncate">
                {company.name}
              </h3>
              {company.origin_country && (
                <p className="text-xs text-gray-500 mt-0.5">{company.origin_country}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductionCompaniesSection;
